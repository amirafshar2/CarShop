# ثبت کامپوننت‌های 21st.dev

> قانون پروژه: تمام UI فقط از 21st.dev. هر کامپوننتی که در این جدول نباشد باید حذف شود.
> همه از رجیستری رسمی `https://21st.dev/r/<author>/<slug>` (همان چیزی که `npx shadcn add` می‌گیرد) نصب شده‌اند.
> کد کامل + دموی هر کامپوننت در `docs/21st-sources/<id>.md` نگه داشته شده است.

## کامپوننت‌های بخش‌ها

| بخش سایت | کامپوننت | نویسنده | لینک 21st | تغییرات (فقط محتوا / RTL / رنگ / فونت / اتصال API) |
|---|---|---|---|---|
| هیرو — ویدیو اسکرول | Scroll-Linked Video Scrubber (#19344) | @pulkitxm | https://21st.dev/@pulkitxm/components/scroll-linked-video-scrubber | بدون تغییر |
| تیترهای متحرک | Text Reveal (Mask) (#19257) | @soralabs | https://21st.dev/@soralabs/components/text-reveal-mask | بدون تغییر (برای فارسی فقط `splitBy="words"`؛ حالت chars حروف را جدا می‌کند) |
| نوبار + منوی موبایل | Mega Menu Navbar (#31723) | @anelkabag | https://21st.dev/@anelkabag/components/navbar2 | منوها و متن‌ها فارسی، لوگو MM، رنگ‌ها به توکن‌های تم، `fixed` روی هیرو، کلاس‌های جهت‌دار به منطقی (start/end) |
| خرید از راه دور (۴ مرحله) | Scroll 01 (#18041) | @felipemenezes098 | https://21st.dev/@felipemenezes098/components/scroll-01 | بدون تغییر |
| موجودی امروز (جایگزین Slick) | 3D Coverflow Carousel (#25480) | @dg.singh252525 | https://21st.dev/@dg.singh252525/components/3-d-coverflow-carousel | فونت → وزیرمتن، aria-labelها فارسی |
| شمارنده‌ها | Count Up (#20068) | @unlumen | https://21st.dev/@unlumen/components/count-up | بدون تغییر |
| خدمات (Bento) | Bento Grid (#622) | @kokonutd | https://21st.dev/@kokonutd/components/bento-grid | بدون تغییر |
| سازمان‌های طرف قرارداد | Logo Marquee (#23537) | @ddoemonn | https://21st.dev/@ddoemonn/components/logo-marquee | بدون تغییر |
| «ماشینت رو بفروش» | CTA Section with Noise Shader (#27553) | @shadcnui-blocks | https://21st.dev/@shadcnui-blocks/components/cta-06 | متن‌ها و لینک‌ها به props تبدیل شد |
| نظرات | Vertical Testimonials Marquee (#26568) | @shadcnspace | https://21st.dev/@shadcnspace/components/marquee-03 | لیست نظرات به prop تبدیل شد (در دمو: «متن نمونه»، بدون عکس آدم واقعی) |
| معرفی نمایشگاه | Zoom Parallax (#5967) | @efferd | https://21st.dev/@efferd/components/zoom-parallax | بدون تغییر |
| فوتر | Footer with Suite (#29773) | @scrollxui | https://21st.dev/@scrollxui/components/footer-with-suite | متن ثابت انگلیسی به prop `question` تبدیل شد |
| کارت خودرو | Spotlight Card (#2220) | @preetsuthar17 | https://21st.dev/@preetsuthar17/components/spotlight-card | بدون تغییر (رنگ spotlight نارنجی برند از طریق prop) |
| گالری صفحه‌ی خودرو | Thumbnail image viewer (#37501) | @ibrandify | https://21st.dev/@ibrandify/components/thumbnail-image-viewer | بدون تغییر |
| فیلتر قیمت | Price Range Slider (#26539) | @shadcnspace | https://21st.dev/@shadcnspace/components/slider-06 | min/max/step/متن‌ها/onCommit به props تبدیل شد، `dir="ltr"` برای محور اعداد |
| ورود با کد پیامکی | OTP Input (#34833) | @uvain | https://21st.dev/@uvain/components/otp-input-verification | «Optional» → «اختیاری» |
| فرم تماس / سرنخ | Contact Form (#35258) | @kevingirelli | https://21st.dev/@kevingirelli/components/contact-form | فیلد ایمیل → موبایل (`type="tel"`)، `Field` (که در رجیستری 21st نیست) با `Label` همان رجیستری جایگزین شد، دکمه از فایل همراه خود کامپوننت |

## پنل مدیریت، پنل کاربر و صفحه‌ی خدمات

| بخش سایت | کامپوننت | نویسنده | لینک 21st | تغییرات (فقط محتوا / RTL / رنگ / فونت / اتصال API) |
|---|---|---|---|---|
| منوی کناری پنل مدیریت | Sidebar (#31454) | @wensity | https://21st.dev/@wensity/components/sidebar | لینک‌ها با `next/link`، `border-r`→`border-e` و `text-left`→`text-start` برای RTL، متن‌های aria فارسی، آیکون جمع‌کردن آینه شد |
| کارت‌های آمار داشبورد | Statistics Card 7 (#4435) | @sean0205 | https://21st.dev/@sean0205/components/statistics-card-7 | چیدمان دموی همین کامپوننت با کارت‌ها به‌صورت prop (فایل اصلی فقط یک placeholder بود) |
| کارت قیمت خدمات (`/services`) | Pricing Card (#5115) | @efferd | https://21st.dev/@efferd/components/pricing-card | بدون تغییر (فقط محتوا و `max-w-none`) |

 (از رجیستری 21st: `21st.dev/r/shadcn/*`)

button, card, input, textarea, label, badge, select, separator, skeleton, sheet, slider, sonner, checkbox,
table, dialog, alert-dialog, switch, tabs, dropdown-menu (+ badge-2, button-1, avatar از وابستگی‌های Statistics Card)

تغییرات RTL در پایه‌ها: دکمه‌ی بستن Dialog/Sheet به گوشه‌ی چپ و «بستن» فارسی، `text-left`→`text-start` در Table و هدر Dialog، حرکت دستگیره‌ی Switch در RTL.

## تم

**Darkmatter** (@serafimcloud) — https://21st.dev/community/themes/darkmatter — فقط توکن‌های رنگ (مشکی/سفید/نارنجی برند) و فونت (وزیرمتن) تغییر کرد.

## کنار گذاشته‌شده

| کامپوننت | دلیل |
|---|---|
| Scroll-Locked Video Hero (#25500, @gughigug) | کل صفحه را برای همیشه قفل می‌کند؛ برای صفحه‌ی تک‌بخشی ساخته شده و بازدیدکننده به بخش‌های پایین نمی‌رسد. |
| Hero Scrub (#12213, @jean.duthil13) | نیاز به سری فریم (Image Sequence) دارد؛ وقتی ویدیوی واقعی خود نمایشگاه آماده شد، با ffmpeg فریم‌ها ساخته و جایگزین می‌شود. |
