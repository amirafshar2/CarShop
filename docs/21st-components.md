# ثبت کامپوننت‌های 21st.dev

> کامپوننت‌های بصری سایت از 21st.dev هستند. بخش‌های فرم پنل و دستیار (`components/admin/*`، `components/site/*`) و گالری صفحه‌ی آیتم، ساخت خود پروژه روی همان پایه‌های shadcn از رجیستری 21st است.
> همه از رجیستری رسمی `https://21st.dev/r/<author>/<slug>` (همان چیزی که `npx shadcn add` می‌گیرد) نصب شده‌اند.
> کد کامل + دموی هر کامپوننت در `docs/21st-sources/<id>.md` نگه داشته شده است.

## کامپوننت‌های بخش‌ها

| بخش سایت | کامپوننت | نویسنده | لینک 21st | تغییرات (فقط محتوا / RTL / رنگ / فونت / اتصال API) |
|---|---|---|---|---|
| تیترهای متحرک | Text Reveal (Mask) (#19257) | @soralabs | https://21st.dev/@soralabs/components/text-reveal-mask | بدون تغییر (برای فارسی فقط `splitBy="words"`؛ حالت chars حروف را جدا می‌کند) |
| نوبار + منوی موبایل | Mega Menu Navbar (#31723) | @anelkabag | https://21st.dev/@anelkabag/components/navbar2 | مگامنو حذف شد؛ لوگو، لینک‌ها، شبکه‌های اجتماعی و دکمه از تنظیمات سایت می‌آیند؛ کلاس‌های جهت‌دار به start/end |
| کادر دعوت به تماس | CTA Section with Noise Shader (#27553) | @shadcnui-blocks | https://21st.dev/@shadcnui-blocks/components/cta-06 | متن‌ها و لینک‌ها به props تبدیل شد |
| فوتر | Footer with Suite (#29773) | @scrollxui | https://21st.dev/@scrollxui/components/footer-with-suite | متن ثابت انگلیسی به prop `question` تبدیل شد |
| ورود با کد پیامکی | OTP Input (#34833) | @uvain | https://21st.dev/@uvain/components/otp-input-verification | «Optional» → «اختیاری» |
| فرم تماس / سرنخ | Contact Form (#35258) | @kevingirelli | https://21st.dev/@kevingirelli/components/contact-form | فیلد ایمیل → موبایل (`type="tel"`)، `Field` (که در رجیستری 21st نیست) با `Label` همان رجیستری جایگزین شد، دکمه از فایل همراه خود کامپوننت |

## پنل مدیریت، پنل مشتری و صفحه‌ی خدمات

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

**Darkmatter** (@serafimcloud) — https://21st.dev/community/themes/darkmatter — رنگ اصلی و گردی گوشه‌ها در زمان اجرا از تنظیمات سایت (CSS variables) می‌آیند؛ فونت وزیرمتن.
