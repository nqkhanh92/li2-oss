import 'server-only'

import { ArtifactLandingLanguage } from '@/core/helpers/artifact-landing'

/**
 * Khung HTML chung cho MỌI trang `/a/<token>` do li2 render: landing Office/video, bia mộ 410, và
 * bốn trang cổng (401/403/429/503). Tách khỏi `route.ts` vì file route của Next chỉ được export
 * handler + segment config, mà các trang cổng cần dùng chung đúng khung này — một khung thứ hai là
 * một chỗ thứ hai cho màu sắc và `lang` lệch đi.
 *
 * Giao diện chép từ trang mật khẩu của SHORT LINK do li2-be phục vụ
 * (`li2-be/src/templates/authentication.html`, CSS dòng 31–229): nền sáng `rgb(249,251,253)` phủ lớp
 * chấm `radial-gradient(#d0d5d5 2px, transparent 0)` bước 20px, mascot robot ở giữa, tiêu đề đậm,
 * ô nhập bo 8px viền `#000d27`, nút đen `#000d27` có mũi tên. Người quét QR gặp cả hai trang trong
 * cùng một luồng, nên hai giao diện khác nhau là hai sản phẩm khác nhau dưới mắt họ.
 *
 * KHÔNG còn `prefers-color-scheme: dark`: theme của li2-be chỉ có bản sáng, nên giữ dark mode ở đây
 * nghĩa là trang cổng artifact nền đen đứng cạnh trang cổng short link nền trắng — đúng cái lệch
 * mà file này tồn tại để chặn.
 *
 * Font `"Be Vietnam Pro"` chỉ là nguyện vọng, không phải lời hứa: `default-src 'none'` chặn webfont
 * từ Google Fonts, và bộ font của app nằm ở `src/app/fonts/*.ttf` do `next/font/local` băm tên khi
 * build — không có URL ổn định cho `@font-face` trỏ vào, và `public/fonts/` không tồn tại. Máy nào
 * có sẵn font thì dùng, còn lại rơi về `system-ui`. Muốn đúng font cho mọi khách thì phải đặt một
 * bản `.woff2` vào `public/fonts/` rồi thêm `font-src 'self'` vào CSP cổng — chưa làm, vì đó là nới
 * CSP cho một việc thẩm mỹ.
 *
 * Một stylesheet nội tuyến, không request ra ngoài: `style-src 'unsafe-inline'` chỉ bao khối này —
 * không có script nào trên các trang này.
 *
 * `font-size: 16px` ở ô nhập để iOS không tự phóng to khi focus.
 */
export type LandingLayout =
  /** Landing Office/video: khung rộng, canh lề trái, không mascot. */
  | 'viewer'
  /** Trang cổng và bia mộ 410: một cột hẹp canh giữa, mascot ở trên tiêu đề. */
  | 'gate'

export function landingShell(
  escapedTitle: string,
  body: string,
  lang: ArtifactLandingLanguage,
  /** Markup rendered BEFORE the `<h1>` — the mascot and the tombstone brand mark sit there. */
  aboveTitle = '',
  layout: LandingLayout = 'viewer'
) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapedTitle}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 16px; min-height: 100vh; color: #334155;
         font-family: "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
         background-color: rgb(249, 251, 253);
         background-image: radial-gradient(circle at center, rgba(249, 251, 253, .7) 5%,
                                           rgba(249, 251, 253, 1) 70%),
                           radial-gradient(#d0d5d5 2px, transparent 0);
         background-size: 100% 100%, 20px 20px; }
  .shell { max-width: 980px; margin: 0 auto; }
  .shell.gate { max-width: 500px; padding: 10vh 8px 48px; text-align: center; }
  h1 { font-size: 1.125rem; font-weight: 600; margin: 0 0 12px; overflow-wrap: anywhere; }
  .shell.gate h1 { font-size: 1.5rem; margin: 0 0 8px; }
  .mascot { display: block; width: 120px; height: 120px; margin: 0 auto 24px;
            animation: bounce .7s infinite alternate; }
  @keyframes bounce { 0% { transform: translate(0, 5px); } 100% { transform: translate(0, -5px); } }
  .viewer { width: 100%; aspect-ratio: 16 / 10; border: 0; border-radius: 8px; background: #000;
            display: block; }
  .note { font-size: .8125rem; opacity: .7; margin: 12px 0 0; }
  .download { display: inline-block; margin-top: 16px; padding: 10px 16px; border-radius: 8px;
              background: #000d27; color: #fff; text-decoration: none; font-weight: 600; }
  .download:hover { background: #081842; }
  /* Bia mộ 410: dấu thương hiệu xanh li2, icon slate-400. */
  .gone-brand { display: inline-flex; align-items: center; gap: 6px; color: #2563eb;
                font-weight: 600; margin-bottom: 20px; }
  .gone-icon { color: #94a3b8; margin-bottom: 10px; }
  .gone-reassure { margin: 16px auto 0; padding: 12px 14px; border-radius: 8px; background: #eef2f7;
                   font-size: .9375rem; line-height: 1.5; }
  .gone-reassure b { font-weight: 600; }
  .gone-foot { font-size: .8125rem; color: #94a3b8; margin: 28px 0 0; }
  .gone-foot a { color: inherit; }
  /* Gate pages: the only pages under /a/ with a form. */
  .gate-lead { font-size: 1rem; line-height: 1.5; margin: 0 0 24px; opacity: .9; }
  .gate-label { display: block; font-size: 1rem; font-weight: 400; margin: 0 0 8px; }
  .gate-input { display: block; width: 250px; max-width: 100%; height: 44px; margin: 0 auto;
                padding: 0 12px; font: inherit; font-size: 16px; border: 1px solid #000d27;
                border-radius: 8px; background: #fff; color: #000d27; }
  .gate-input:focus-visible { outline: 2px solid #000d27; outline-offset: 1px; }
  .gate-input.bad { border-color: #dc2626; }
  .gate-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px;
              margin-top: 20px; padding: 8px 16px; border: 0; border-radius: 8px;
              background: #000d27; color: #fff; font: inherit; font-size: 16px; line-height: 24px;
              text-decoration: none; cursor: pointer;
              transition: background .3s ease, transform .3s ease, box-shadow .3s ease; }
  .gate-btn:hover { background: #081842; transform: translateY(-2px);
                    box-shadow: 0 5px 20px rgba(0, 0, 0, .2); }
  .gate-btn:focus-visible { outline: 2px solid #000d27; outline-offset: 2px; }
  .gate-btn svg { width: 20px; height: 20px; flex: none; }
  .gate-form { margin: 0; }
  .gate-err { margin: 12px 0 0; font-size: .875rem; line-height: 1.45; color: #dc2626; }
  .gate-hint { margin: 16px auto 0; padding: 10px 12px; border-radius: 8px; background: #eef2f7;
               font-size: .875rem; line-height: 1.45; }
  .gate-email { font-size: .8125rem; color: #94a3b8; margin: -6px 0 14px; overflow-wrap: anywhere; }
  @media (max-width: 480px) {
    .shell.gate { padding: 6vh 4px 32px; }
    .shell.gate h1 { font-size: 1.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important;
                             animation-iteration-count: 1 !important;
                             transition-duration: .01ms !important; }
  }
</style>
</head>
<body>
<main class="shell ${layout}">
${aboveTitle}
<h1>${escapedTitle}</h1>
${body}
</main>
</body>
</html>`
}

/** Dấu thương hiệu li2 — SVG nội tuyến vì `default-src 'none'`. Bia mộ 410 dùng. */
export const LI2_BRAND_MARK = `<div class="gone-brand">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      <span>li2</span>
    </div>`

/**
 * Mũi tên trong nút — chép từ nút "Submit" của li2-be. `stroke="currentColor"` chứ không `white`
 * như bản gốc, để nút đổi màu chữ thì mũi tên đi theo.
 */
export const ARROW_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4.16675 9.99984H15.8334M15.8334 9.99984L10.0001 4.1665M15.8334 9.99984L10.0001 15.8332" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`

/**
 * Mascot robot — chép nguyên từ `li2-be/src/templates/authentication.html`, nội tuyến vì
 * `default-src 'none'` không tải nổi ảnh ngoài (và vì một `<img>` ở đây sẽ phá luôn test "logo và
 * icon là SVG nội tuyến" của bia mộ).
 *
 * Giữ cả `animateTransform` của hai tai và `animate` nháy mắt: đó là SMIL bên trong SVG, không phải
 * script, nên trang vẫn tuyệt đối không có `<script>`. Đổi lại, `prefers-reduced-motion` chỉ tắt
 * được animation CSS — mascot vẫn nhúc nhích khi khách tắt chuyển động, đúng như trên trang short
 * link hôm nay.
 */
export const ROBOT_MASCOT = `<svg class="mascot" aria-hidden="true" width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M33.8281 31.0123C35.2678 33.5058 33.4213 37.2669 29.7038 39.4133C25.9864 41.5593 21.8058 41.2779 20.366 38.7844C18.9263 36.2911 20.7731 32.5303 24.4903 30.3837C28.2075 28.2376 32.3886 28.5187 33.8281 31.0123Z" fill="black" /><g><path d="M23.1568 34.7573C22.5913 34.0916 21.1707 31.5813 16.8003 23.7929L19.7927 21.5342C23.4168 25.169 27.9684 29.7643 28.197 29.8986C28.2205 29.9121 23.1568 34.7573 23.1568 34.7573Z" fill="black" /><path d="M22.6245 21.5157C22.6245 24.5301 20.1808 26.9738 17.1661 26.9738C14.1515 26.9738 11.708 24.5301 11.708 21.5157C11.708 18.5013 14.1515 16.0576 17.1661 16.0576C20.1808 16.0576 22.6245 18.5013 22.6245 21.5157Z" fill="#4125B9" /><path d="M17.1664 16.0576C16.7311 16.0576 16.3076 16.1088 15.9019 16.2047C18.3069 16.7751 20.0963 18.9363 20.0963 21.5157C20.0963 24.0949 18.3069 26.2564 15.9019 26.8268C16.3076 26.9229 16.7311 26.9738 17.1664 26.9738C20.181 26.9738 22.6242 24.5304 22.6242 21.5157C22.6242 18.5013 20.181 16.0576 17.1664 16.0576Z" fill="#E2E8F0" /><path d="M15.9019 26.8264C21.5517 27.9314 24.7481 20.808 20.4594 17.3462C19.2253 16.3279 17.5171 15.8891 15.9019 16.2044C19.1887 15.2507 22.7816 17.7378 22.807 21.5157C22.7799 25.2534 19.2179 27.7874 15.9019 26.8264Z" fill="black" /><path d="M17.1666 21.0856C17.1666 22.3301 16.1577 23.3386 14.9132 23.3386C13.669 23.3386 12.6602 22.3301 12.6602 21.0856C12.6602 19.8411 13.669 18.8325 14.9132 18.8325C16.1577 18.8325 17.1666 19.8411 17.1666 21.0856Z" fill="white" /><animateTransform attributeName="transform" attributeType="XML" type="rotate" values="-10 23 28; 10 23 28; -10 23 28" dur="1.2s" repeatCount="indefinite" /></g><path d="M88.156 31.708C86.7165 34.2016 88.5628 37.9627 92.2805 40.109C95.998 42.2551 100.178 41.9737 101.618 39.4801C103.058 36.9866 101.211 33.2258 97.4938 31.0797C93.7763 28.9333 89.5955 29.2145 88.156 31.708Z" fill="black" /><g><path d="M98.8279 35.4527C99.3929 34.787 100.813 32.2766 105.184 24.4882L102.191 22.2295C98.5671 25.8643 94.0155 30.4596 93.7872 30.5936C93.7636 30.6077 98.8279 35.4527 98.8279 35.4527Z" fill="black" /><path d="M99.3596 22.2108C99.3596 25.2254 101.803 27.6691 104.818 27.6691C107.832 27.6691 110.276 25.2254 110.276 22.2108C110.276 19.1967 107.832 16.7529 104.818 16.7529C101.803 16.7529 99.3596 19.1967 99.3596 22.2108Z" fill="#4125B9" /><path d="M104.818 16.7534C105.253 16.7534 105.676 16.8043 106.082 16.9008C103.677 17.4709 101.888 19.6324 101.888 22.2115C101.888 24.7909 103.677 26.9522 106.082 27.5226C105.676 27.6187 105.253 27.6699 104.818 27.6699C101.803 27.6699 99.3596 25.2262 99.3596 22.2115C99.3596 19.1971 101.803 16.7534 104.818 16.7534Z" fill="#E2E8F0" /><path d="M106.082 27.5216C100.432 28.6269 97.2357 21.5029 101.524 18.0413C102.759 17.0227 104.467 16.5845 106.082 16.8998C102.795 15.9459 99.2017 18.4327 99.1763 22.2106C99.2036 25.9486 102.766 28.4825 106.082 27.5216Z" fill="black" /><path d="M104.817 21.7809C104.817 23.0254 105.826 24.0342 107.07 24.0342C108.315 24.0342 109.324 23.0254 109.324 21.7809C109.324 20.5364 108.315 19.5278 107.07 19.5278C105.826 19.5278 104.817 20.5364 104.817 21.7809Z" fill="white" /><animateTransform attributeName="transform" attributeType="XML" type="rotate" values="10 99 29; -10 99 29; 10 99 29" dur="1.2s" repeatCount="indefinite" /></g><path d="M3 67.1357C3 81.3927 28.734 92.9502 60.4792 92.9502C92.2247 92.9502 117.959 81.3927 117.959 67.1357C117.959 52.879 92.2247 41.3218 60.4792 41.3218C28.734 41.3218 3 52.879 3 67.1357Z" fill="#4125B9" /><path d="M111.249 79.2502C110.229 80.1101 109.105 80.9416 107.882 81.7403C110.86 73.1746 112.15 63.6641 111.838 55.5317C112.777 56.3683 113.618 57.2312 114.353 58.1171C114.327 64.8216 113.31 72.2259 111.249 79.2502Z" fill="#E2E8F0" /><path d="M6.62085 58.0981C7.35995 57.2103 8.20495 56.3458 9.14854 55.5073C8.66618 63.7163 10.3115 73.3913 13.5932 82.0728C12.3205 81.2682 11.1478 80.4297 10.0832 79.5606C7.78435 72.4014 6.58618 64.8708 6.62085 58.0981Z" fill="#E2E8F0" /><path d="M44.8569 103.701C55.5031 102.224 66.3042 101.997 77.0384 103.04C101.726 105.439 110.511 68.4624 106.99 49.8521C105.196 40.3624 94.6193 33.562 85.6896 31.4501C69.5057 27.6224 52.2165 27.3808 35.9492 30.7955C27.2205 32.6545 18.5869 38.5762 15.1879 47.0864C8.08855 64.8658 20.7419 107.047 44.8569 103.701Z" fill="#E2E8F0" /><path d="M15.1879 47.0871C16.8679 42.8805 19.8273 39.3066 23.4443 36.543C22.2298 38.1615 21.2164 39.9232 20.4618 41.8131C13.3628 59.5925 26.0155 101.774 50.1306 98.4284C60.777 96.9513 71.5784 96.724 82.3123 97.7673C88.1688 98.3366 93.1302 96.6891 97.245 93.5973C92.3483 99.9101 85.6642 103.879 77.0384 103.041C66.3042 101.998 55.5028 102.225 44.8569 103.702C20.7419 107.048 8.08855 64.8664 15.1879 47.0871Z" fill="#E2E8F0" /><path d="M82.4138 45.5202C67.8278 44.3865 53.1747 44.3865 38.5884 45.5202C15.1979 47.3383 7.14465 85.999 49.451 91.7945C62.8713 93.6332 78.9867 92.6712 90.7485 85.3836C109.166 73.9723 102.6 47.0891 82.4138 45.5202Z" fill="#4125B9" /><path d="M61.1688 91.9645C57.3371 91.9645 53.4238 91.6945 49.5379 91.1623C27.3173 88.1181 19.7199 76.1126 20.0192 65.8922C20.3252 55.4424 28.33 46.9582 38.6382 46.1568C45.8803 45.5941 53.2364 45.3086 60.5007 45.3086H60.5015C67.7655 45.3086 75.1219 45.5941 82.3645 46.1568C91.185 46.8423 98.2418 52.8676 100.343 61.5063C102.549 70.5768 98.6508 79.7364 90.412 84.8408C80.9104 90.7284 69.2656 91.9645 61.1699 91.9645H61.1688Z" fill="black" /><path d="M70.781 69.8335C72.1569 69.8335 73.3816 70.8072 73.3816 72.1831C73.3816 79.1901 67.2552 84.8706 59.698 84.8706C52.1408 84.8706 46.0144 79.1901 46.0144 72.1831C46.0144 70.8072 47.2391 69.8335 48.615 69.8335H70.781Z" fill="white" /><ellipse cx="42.4058" cy="58.4059" rx="2.4059" ry="2.4059" fill="white"><animate attributeName="ry" values="2.4059;1;2.4059" dur="1.45s" repeatCount="indefinite" /></ellipse><ellipse cx="77.2912" cy="58.4059" rx="2.4059" ry="2.4059" fill="white"><animate attributeName="ry" values="2.4059;1;2.4059" dur="1.45s" repeatCount="indefinite" /></ellipse><path d="M63.7854 35.8563C64.0346 38.0701 70.7348 39.1337 78.6247 40.1542C86.523 41.1034 93.2792 41.7182 94.0643 39.6333C94.8611 37.6045 88.5686 33.3335 79.6124 32.2334C70.6611 31.0999 63.5116 33.694 63.7854 35.8563Z" fill="#EAE9EE" /></svg>`
