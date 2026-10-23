import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { firstValueFrom } from 'rxjs';
import { extname } from 'path';

@Injectable()
export class ZTTeamHtmlCleanerService {
  private readonly logger = new Logger(ZTTeamHtmlCleanerService.name);

  constructor(private readonly httpService: HttpService) {}

  async ztteam_cleanHtmlAndUploadImages(
    html: string,
    uploadMediaFn: (buffer: Buffer, filename: string, mimeType: string) => Promise<string>
  ): Promise<string> {
    const $ = cheerio.load(html, undefined, false);

    /** 1. Remove unwanted tags */
    $('script, style, noscript, iframe, form, button, input, select, textarea').remove();

    /** 2. Remove all attributes from all elements EXCEPT src and alt for img */
    $('*').each((_, el) => {
      if (el.type === 'tag') {
        const allowedAttrs = el.tagName.toLowerCase() === 'img' ? ['src', 'alt'] : [];
        const attribs = { ...el.attribs }; /** clone to iterate */
        for (const attr in attribs) {
          if (!allowedAttrs.includes(attr.toLowerCase())) {
            $(el).removeAttr(attr);
          }
        }
      }
    });

    /** 3. Handle <a> tags: if contains <img>, unwrap keeping contents; otherwise replace with text */
    $('a').each((_, el) => {
      if ($(el).find('img').length > 0) {
        $(el).replaceWith($(el).contents());
      } else {
        $(el).replaceWith($(el).text());
      }
    });

    /** 4. Unwrap div and span tags to keep just the semantic structure (p, img, h1-h6) */
    /** We do this repeatedly until there are no div or span tags left */
    let hasDivsOrSpans = true;
    while (hasDivsOrSpans) {
      const wrappers = $('div, span');
      if (wrappers.length === 0) {
        hasDivsOrSpans = false;
      } else {
        wrappers.each((_, el) => {
          $(el).replaceWith($(el).contents());
        });
      }
    }

    /** 5. Remove empty paragraphs and empty headings */
    $('p, h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim();
      const hasImg = $(el).find('img').length > 0;
      if (!text && !hasImg) {
        $(el).remove();
      }
    });

    /** 6. Process <img> tags */
    const images = $('img').toArray();
    for (const img of images) {
      let src = $(img).attr('src');
      if (!src) continue;

      /** Handle protocol-relative URL */
      if (src.startsWith('//')) {
        src = `https:${src}`;
      }

      /** Skip 1x1 transparent placeholders */
      if (src.startsWith('data:image/') && src.length < 200) {
        $(img).remove();
        continue;
      }

      try {
        let buffer: Buffer;
        let mimeType = 'image/jpeg';
        let ext = '.jpg';

        if (src.startsWith('data:image/')) {
          const matches = src.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
            if (mimeType.includes('png')) ext = '.png';
            else if (mimeType.includes('webp')) ext = '.webp';
            else if (mimeType.includes('gif')) ext = '.gif';
          } else {
            $(img).remove();
            continue;
          }
        } else {
          /** Download image with browser headers and 15s timeout */
          const response = await firstValueFrom(
            this.httpService.get(src, {
              responseType: 'arraybuffer',
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              }
            })
          );

          buffer = Buffer.from(response.data);
          const contentType = response.headers['content-type'] as string | undefined;

          if (contentType) {
            mimeType = contentType;
            if (contentType.includes('png')) ext = '.png';
            else if (contentType.includes('webp')) ext = '.webp';
            else if (contentType.includes('gif')) ext = '.gif';
            else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
          } else {
            const parsedExt = extname(src.split('?')[0]);
            if (parsedExt) ext = parsedExt;
          }
        }

        const filename = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;

        /** Upload to WordPress */
        const newUrl = await uploadMediaFn(buffer, filename, mimeType);

        /** Replace src with newly uploaded WordPress URL */
        $(img).attr('src', newUrl);
        /** Remove lazy loading attributes if any */
        $(img).removeAttr('loading').removeAttr('srcset').removeAttr('sizes');

      } catch (error: any) {
        this.logger.warn(`Failed to process or upload image: ${src} (${error.message}). Retaining original image.`);
        /** If image upload fails, retain original remote URL if valid instead of deleting the image */
        if (!src.startsWith('http://') && !src.startsWith('https://')) {
          $(img).remove();
        }
      }
    }

    return $.html();
  }
}
