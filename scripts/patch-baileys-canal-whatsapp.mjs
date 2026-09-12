/**
 * Baileys 7.0.0-rc14 sobe foto de canal em /mms/* e monta o protobuf/stanza
 * como se fosse grupo. O post “passa”, mas a foto não aparece (ACK 479).
 *
 * Port do PR https://github.com/WhiskeySockets/Baileys/pull/2434 e do
 * patch em https://github.com/WhiskeySockets/Baileys/issues/2562, no estado
 * final testado: CDN /newsletter/*, omite url, thumb do CDN, mediatype no
 * nó plaintext.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(raiz, "node_modules", "@whiskeysockets", "baileys", "lib");

if (!existsSync(lib)) {
  console.warn("[baileys-canal] @whiskeysockets/baileys não instalado — pulando patch.");
  process.exit(0);
}

let patched = 0;
let skipped = 0;
let failed = 0;

function patchFile(relativePath, description, alreadyThere, from, to) {
  const filePath = join(lib, relativePath);
  if (!existsSync(filePath)) {
    console.error(`[baileys-canal] ERRO: ${relativePath} não existe.`);
    failed += 1;
    return;
  }

  let content = readFileSync(filePath, "utf8");
  if (content.includes(alreadyThere)) {
    skipped += 1;
    return;
  }
  if (!content.includes(from)) {
    console.error(`[baileys-canal] ERRO: padrão não encontrado em ${relativePath} (${description}).`);
    failed += 1;
    return;
  }

  writeFileSync(filePath, content.replace(from, to), "utf8");
  console.log(`[baileys-canal] patch: ${description}`);
  patched += 1;
}

patchFile(
  "Defaults/index.js",
  "NEWSLETTER_MEDIA_PATH_MAP",
  "NEWSLETTER_MEDIA_PATH_MAP",
  `export const MEDIA_PATH_MAP = {
    image: '/mms/image',
    video: '/mms/video',
    document: '/mms/document',
    audio: '/mms/audio',
    sticker: '/mms/image',
    'thumbnail-link': '/mms/image',
    'product-catalog-image': '/product/image',
    'md-app-state': '',
    'md-msg-hist': '/mms/md-app-state',
    'biz-cover-photo': '/pps/biz-cover-photo'
};`,
  `export const MEDIA_PATH_MAP = {
    image: '/mms/image',
    video: '/mms/video',
    document: '/mms/document',
    audio: '/mms/audio',
    sticker: '/mms/image',
    'thumbnail-link': '/mms/image',
    'product-catalog-image': '/product/image',
    'md-app-state': '',
    'md-msg-hist': '/mms/md-app-state',
    'biz-cover-photo': '/pps/biz-cover-photo'
};
export const NEWSLETTER_MEDIA_PATH_MAP = {
    image: '/newsletter/newsletter-image',
    video: '/newsletter/newsletter-video',
    document: '/newsletter/newsletter-document',
    audio: '/newsletter/newsletter-audio',
    sticker: '/newsletter/newsletter-image',
    'thumbnail-link': '/newsletter/newsletter-thumbnail-link'
};`,
);

patchFile(
  "Utils/messages-media.js",
  "import NEWSLETTER_MEDIA_PATH_MAP",
  "NEWSLETTER_MEDIA_PATH_MAP } from",
  "import { DEFAULT_ORIGIN, MEDIA_HKDF_KEY_MAPPING, MEDIA_PATH_MAP } from '../Defaults/index.js';",
  "import { DEFAULT_ORIGIN, MEDIA_HKDF_KEY_MAPPING, MEDIA_PATH_MAP, NEWSLETTER_MEDIA_PATH_MAP } from '../Defaults/index.js';",
);

patchFile(
  "Utils/messages-media.js",
  "getWAUploadToServer newsletter flag",
  "timeoutMs, newsletter",
  `export const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
    return async (filePath, { mediaType, fileEncSha256B64, timeoutMs }) => {`,
  `export const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
    return async (filePath, { mediaType, fileEncSha256B64, timeoutMs, newsletter }) => {`,
);

patchFile(
  "Utils/messages-media.js",
  "CDN /newsletter/* + server_thumb_gen",
  "newsletter ? NEWSLETTER_MEDIA_PATH_MAP",
  "const url = `https://${hostname}${MEDIA_PATH_MAP[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`;",
  `const mediaPath = (newsletter ? NEWSLETTER_MEDIA_PATH_MAP[mediaType] : MEDIA_PATH_MAP[mediaType]) ?? MEDIA_PATH_MAP[mediaType];
            const url = \`https://\${hostname}\${mediaPath}/\${fileEncSha256B64}?auth=\${auth}&token=\${fileEncSha256B64}\${newsletter ? '&server_thumb_gen=1' : ''}\`;`,
);

patchFile(
  "Utils/messages-media.js",
  "thumbnail_info no retorno do upload",
  "thumbnail_direct_path",
  `if (result?.url || result?.direct_path) {
                    urls = {
                        mediaUrl: result.url,
                        directPath: result.direct_path,
                        meta_hmac: result.meta_hmac,
                        fbid: result.fbid,
                        ts: result.ts
                    };`,
  `if (result?.url || result?.direct_path) {
                    urls = {
                        mediaUrl: result.url,
                        directPath: result.direct_path,
                        meta_hmac: result.meta_hmac,
                        fbid: result.fbid,
                        ts: result.ts
                    };
                    if (newsletter && result.thumbnail_info) {
                        urls.thumbnailDirectPath = result.thumbnail_info.thumbnail_direct_path;
                        urls.thumbnailSha256 = result.thumbnail_info.thumbnail_sha256;
                    }`,
);

patchFile(
  "Utils/messages.js",
  "prepareWAMessageMedia passa newsletter: true",
  "newsletter: true",
  `const { mediaUrl, directPath } = await options.upload(filePath, {
            fileEncSha256B64: fileSha256B64,
            mediaType: mediaType,
            timeoutMs: options.mediaUploadTimeoutMs
        });`,
  `const uploadResult = await options.upload(filePath, {
            fileEncSha256B64: fileSha256B64,
            mediaType: mediaType,
            timeoutMs: options.mediaUploadTimeoutMs,
            newsletter: true
        });
        const mediaUrl = uploadResult.mediaUrl;
        const directPath = uploadResult.directPath;
        const thumbnailDirectPath = uploadResult.thumbnailDirectPath;
        const thumbnailSha256 = uploadResult.thumbnailSha256;`,
);

patchFile(
  "Utils/messages.js",
  "protobuf do canal: sem url, com thumb do CDN",
  "url: undefined,",
  `const obj = WAProto.Message.fromObject({
            // todo: add more support here
            [\`\${mediaType}Message\`]: MessageTypeProto[mediaType].fromObject({
                url: mediaUrl,
                directPath,
                fileSha256,
                fileLength,
                ...uploadData,
                media: undefined
            })
        });`,
  `const obj = WAProto.Message.fromObject({
            // todo: add more support here
            [\`\${mediaType}Message\`]: MessageTypeProto[mediaType].fromObject({
                directPath,
                fileSha256,
                fileLength,
                ...(thumbnailDirectPath && { thumbnailDirectPath }),
                ...(thumbnailSha256 && { thumbnailSha256 }),
                ...uploadData,
                media: undefined,
                url: undefined,
            })
        });`,
);

patchFile(
  "Socket/messages-send.js",
  "mediatype no plaintext do canal",
  "mediatype: mediaType",
  `binaryNodeContent.push({
                    tag: 'plaintext',
                    attrs: {},
                    content: bytes
                });`,
  `binaryNodeContent.push({
                    tag: 'plaintext',
                    attrs: mediaType ? { mediatype: mediaType } : {},
                    content: bytes
                });`,
);

console.log(`[baileys-canal] aplicados=${patched} já-ok=${skipped} falhas=${failed}`);
if (failed > 0 && patched === 0 && skipped === 0) {
  process.exit(1);
}
