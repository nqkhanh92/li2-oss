## [1.28.0](https://github.com/QQuik/li2-app/compare/v1.27.1...v1.28.0) (2026-06-16)

### ✨ Features

* **analytics:** add customer_external_id fallback to visitor column ([abc9598](https://github.com/QQuik/li2-app/commit/abc95986fb819ca91ce1393a5777abb5a9f83119))
* **logging:** add structured request logging across all middleware wrappers ([0031227](https://github.com/QQuik/li2-app/commit/003122715d019add07ac47f7cd253aed633e6fc7))

### 🧪 Tests

* **with-auth:** add info mock to logger to fix failing tests ([55b6f0c](https://github.com/QQuik/li2-app/commit/55b6f0c7ac1345bc00850a6b0bcb99141b12d1c5))

## [1.27.1](https://github.com/QQuik/li2-app/compare/v1.27.0...v1.27.1) (2026-06-12)

### 🐛 Bug Fixes

* **custom-domains:** improve subdomain validation UX and i18n ([6b5783a](https://github.com/QQuik/li2-app/commit/6b5783a3a6506d369d8a20c866711fd89127000b))
* **perf:** add API response time logging and fix Chatwoot desktop-only loading ([2d3ed54](https://github.com/QQuik/li2-app/commit/2d3ed5483ac5c9dbc850630489d7e24eb18338ac))

## [1.27.0](https://github.com/QQuik/li2-app/compare/v1.26.0...v1.27.0) (2026-06-12)

### ✨ Features

* improve notification UX with skeleton loaders, empty/error state illustrations, and robust fallback handling for notification attributes. ([0c9c1cd](https://github.com/QQuik/li2-app/commit/0c9c1cd911404a5afd9010544e48b619f9c52521))
* **notifications:** add domain.verified notification type with i18n ([ad5ef17](https://github.com/QQuik/li2-app/commit/ad5ef175da812d96e9ae086253508388d3da299d))
* **notifications:** auto mark-all-read on open, replace button with view-all ([e120e97](https://github.com/QQuik/li2-app/commit/e120e9717141e527ddfd30739a4c946da76fe6dc))

## [1.26.0](https://github.com/QQuik/li2-app/compare/v1.25.0...v1.26.0) (2026-06-11)

### ✨ Features

* add deep link verification API and service ([fab41fd](https://github.com/QQuik/li2-app/commit/fab41fd54507473302ec09b1092191678cd5f5f3))
* add deep link verification API and service ([0d84b7e](https://github.com/QQuik/li2-app/commit/0d84b7e207ad79cc21f1daf036f6f80949a4ab03))
* add persistent log file with pino-roll and volume mount ([257141e](https://github.com/QQuik/li2-app/commit/257141ec47f80ffed0b7e58902813aeabd1ccec6))
* add site page list component and utility functions for building page lists ([63ce490](https://github.com/QQuik/li2-app/commit/63ce490b02f5ce7280ae79aa321a20a4b8e7b60e))
* add Traefik rule to block malformed next-action header requests on dev.example.com ([d4d840d](https://github.com/QQuik/li2-app/commit/d4d840dd05ac0245734ecd7005728a361ab9be26))
* add Traefik rule to block malformed next-action header requests on dev.example.com ([0d70a9c](https://github.com/QQuik/li2-app/commit/0d70a9cd48e8374bf78d62b23d7a39074d2e40fb))
* **analytics:** behavior analytics onboarding wizard and funnel chart improvements ([faf94b2](https://github.com/QQuik/li2-app/commit/faf94b2c986dd4567fa9d517b63a0f587ba75d5d))
* **analytics:** surface visitor & customer identity in engagement tables ([5c01e41](https://github.com/QQuik/li2-app/commit/5c01e417120ece796093393d4a09a5b2264566fa))
* **analytics:** surface visitor & customer identity in engagement tables ([7c42fd8](https://github.com/QQuik/li2-app/commit/7c42fd8c191be4ead05bfb84dc5a3d5425d60d7d))
* **custom-domains:** two-phase verifying badges with hover tooltips ([71da22c](https://github.com/QQuik/li2-app/commit/71da22c745a4c1e7ac2e5db1e4d1295154774a9a))
* **custom-domains:** two-phase verifying badges with hover tooltips ([99138cd](https://github.com/QQuik/li2-app/commit/99138cd5f5058265f95d9843efba4cbba1dd9793))
* **customers:** enrich country and visitor_id via session fallback ([276545e](https://github.com/QQuik/li2-app/commit/276545e7e5284cbe406832609942295a4633c041))
* **customers:** fallback visitor_id from conversion_events for pre-migration visits ([8ecb2dd](https://github.com/QQuik/li2-app/commit/8ecb2ddb336478be06ba901915e76e90aebb6be3))
* deep link analytics page ([773ac35](https://github.com/QQuik/li2-app/commit/773ac35bfc669f7a2b2a298a71daa1274d6c2be5))
* deep link analytics page ([698c8ff](https://github.com/QQuik/li2-app/commit/698c8ff74f2f5a465616ec49534ae7b3f9bc9014))
* **deep_link:** add table and cronjob for deep link app metadata management ([27392d9](https://github.com/QQuik/li2-app/commit/27392d91ed6fc9e335af14698d3aa1f9bc1b87b8))
* **deep-link-analytics:** add deep link ranking feature with new API and UI components ([2205360](https://github.com/QQuik/li2-app/commit/2205360f5e42af74a3f2c36ca9c420eab7649e70))
* **deep-link-analytics:** add deep link ranking feature with new API and UI components ([f8245c1](https://github.com/QQuik/li2-app/commit/f8245c1a2e65194613a97ef25bc85a06993137b0))
* **deep-link-analytics:** enhance deep link analytics with historical data handling and domain nullability ([e9b5896](https://github.com/QQuik/li2-app/commit/e9b589661c14caeb906f27397b2195f0876fd0ae))
* **deep-link-analytics:** enhance deep link analytics with historical data handling and domain nullability ([0354179](https://github.com/QQuik/li2-app/commit/0354179d9cc45a0b9d0b2ad5e6cd3eeaca022771))
* **deep-link:** enhance deep-link analytics with domain verification and UI improvements ([c5f927f](https://github.com/QQuik/li2-app/commit/c5f927fe00e224d076be8c7a120fb290ca941753))
* **deep-link:** enhance deep-link analytics with domain verification and UI improvements ([60a4b2b](https://github.com/QQuik/li2-app/commit/60a4b2b792a13ce0a3b2e41b94f11e531e11195a))
* **deep-links:** add Deep Link Config Panel UI + i18n ([2580772](https://github.com/QQuik/li2-app/commit/2580772bcbb47d973e600b575577c1bff08a2895))
* **deep-links:** add Deep Link Config Panel UI + i18n ([7c1cf88](https://github.com/QQuik/li2-app/commit/7c1cf881f8f26dadc3d439377b494dee36cc9793))
* **deep-links:** add deep_link_apps column + app registry types ([2e9fa91](https://github.com/QQuik/li2-app/commit/2e9fa91b911aa71cd8fd13cea48b6dc16571859c))
* **deep-links:** add deep_link_apps column + app registry types ([cfac381](https://github.com/QQuik/li2-app/commit/cfac381bc33069144bfa4245de1d3efdcc7aee70))
* **deep-links:** add deep_link_events table and update plans for attribution feature ([94bc1c3](https://github.com/QQuik/li2-app/commit/94bc1c3e0dcbc83083229572e7ba14374994ec1c))
* **deep-links:** add deep_link_events table and update plans for attribution feature ([29364ee](https://github.com/QQuik/li2-app/commit/29364eea056f876cce4de4f2b3bf7de9a4179a55))
* **deep-links:** add opt_out to miss_reason enum for IP-fallback pause ([9343def](https://github.com/QQuik/li2-app/commit/9343def9059f4cc95b66ea317a19a29430b00c8e))
* **deep-links:** add opt_out to miss_reason enum for IP-fallback pause ([e0ea795](https://github.com/QQuik/li2-app/commit/e0ea795ba0bd1bae770cea8f0faeb2edce167b6f))
* **deep-links:** conditionally render DeepLinkAnalyticsLink based on deep link config ([17b1b11](https://github.com/QQuik/li2-app/commit/17b1b11203801087b1e4b38e26c47d7aba4bfcb7))
* **deep-links:** conditionally render DeepLinkAnalyticsLink based on deep link config ([0ea3f11](https://github.com/QQuik/li2-app/commit/0ea3f11df9de968f93a992fdca844dbf66c0aeb6))
* **deep-links:** domain card integration, verify route, schema hardening, eligibility rules ([0b3aff0](https://github.com/QQuik/li2-app/commit/0b3aff0637c514c158b7a4f67484d0ce9b28ff5b)), closes [#5](https://github.com/QQuik/li2-app/issues/5) [#6](https://github.com/QQuik/li2-app/issues/6)
* **deep-links:** domain card integration, verify route, schema hardening, eligibility rules ([2a2eac7](https://github.com/QQuik/li2-app/commit/2a2eac731f5dbe7229b4c91a21aaee76d574d14c)), closes [#5](https://github.com/QQuik/li2-app/issues/5) [#6](https://github.com/QQuik/li2-app/issues/6)
* **deep-links:** gate attribution affordances on Custom Domain page ([adb55d5](https://github.com/QQuik/li2-app/commit/adb55d5d0b9c67a68667a963e99878baa69da9e1))
* **deep-links:** gate attribution affordances on Custom Domain page ([57faa57](https://github.com/QQuik/li2-app/commit/57faa577946d93da9535679ff1ab30e474618a78))
* **deep-links:** validate deep_link_apps schema + guard PATCH route ([3f200d1](https://github.com/QQuik/li2-app/commit/3f200d161070ddb12de088f47982a57cc10b6006)), closes [#5](https://github.com/QQuik/li2-app/issues/5)
* **deep-links:** validate deep_link_apps schema + guard PATCH route ([49f35b6](https://github.com/QQuik/li2-app/commit/49f35b6bfa7e41a8d78b0563c1dbcd46d90b7664)), closes [#5](https://github.com/QQuik/li2-app/issues/5)
* filter out recent sessions in session recording repository to allow for enrichment delay ([0e3d2a9](https://github.com/QQuik/li2-app/commit/0e3d2a947c2a88ef1af3e7754c2e20c30ebae6de))
* filter out recent sessions in session recording repository to allow for enrichment delay ([028cb71](https://github.com/QQuik/li2-app/commit/028cb71dfe0ce36edb0d35d6c8b249b2943f2603))
* **funnels:** add funnel list stats, search, and updated layout ([92531fc](https://github.com/QQuik/li2-app/commit/92531fc457e386a84aa7c621d41692498b997a67))
* **i18n:** improve language handling and synchronization for React hydration ([8ad042f](https://github.com/QQuik/li2-app/commit/8ad042fa30861c76062c499bcbe4147a4dec3bb2))
* implement internal service-to-service route for creating ephemeral touch points ([70b48ba](https://github.com/QQuik/li2-app/commit/70b48ba5d542f8aef7894d0da455598ae9c144cf))
* implement internal service-to-service route for creating ephemeral touch points ([69bf2d3](https://github.com/QQuik/li2-app/commit/69bf2d3fb5f96d04b375288f15abfb33bc138919))
* **profiles:** add avatar field and wire it end-to-end ([88cb4fc](https://github.com/QQuik/li2-app/commit/88cb4fc160daed7252d487f17e2b63c30b5ae5f0))
* **profiles:** add avatar field and wire it end-to-end ([7f2c5ea](https://github.com/QQuik/li2-app/commit/7f2c5eafeb86c3ace15b63797f1a0a856ab7a965))
* refactor lastSelectedOrg to per-user array with manual pin support ([447bebe](https://github.com/QQuik/li2-app/commit/447bebe43f43145e21d36b7cc92dd404bbf71976))
* update analytics and realtime data functions to v4 with improved visitor identification and filtering logic ([70b9446](https://github.com/QQuik/li2-app/commit/70b9446593ee9927668df2e03e809f89bb1d6285))
* update custom domain based on cloudflare for saas ([#684](https://github.com/QQuik/li2-app/issues/684)) ([2ce4b7e](https://github.com/QQuik/li2-app/commit/2ce4b7e405ad43a852510eba258366d9f81afcb1))
* update custom domain based on cloudflare for saas ([#684](https://github.com/QQuik/li2-app/issues/684)) ([5b6c93b](https://github.com/QQuik/li2-app/commit/5b6c93b8ba8b86ba5431ffe74323225bcd610763))
* update realtime data translations and align metrics to 24-hour window ([ab7a4f3](https://github.com/QQuik/li2-app/commit/ab7a4f3486ea3ecc5f0bf6ce7d94307943dfcef9))
* update realtime data translations and align metrics to 24-hour window ([e229229](https://github.com/QQuik/li2-app/commit/e2292298f06e2b49fc958ab9d6f251ba8e4544ea))

### 🐛 Bug Fixes

* add pino-roll to serverComponentsExternalPackages ([8634ab3](https://github.com/QQuik/li2-app/commit/8634ab36b108198b98f76fdcd8600c0abb95c8ce))
* **auth:** fix withAuth middleware type, Content-Length bug, and add tests ([7cfe7ee](https://github.com/QQuik/li2-app/commit/7cfe7eead1a00a2070f7a590f02830f63dbefd28))
* **custom-domains:** action menu UI, analytics button placement, delete dialog flow ([54ed804](https://github.com/QQuik/li2-app/commit/54ed80422d49722c5d9fa07c3476d6fe68333a02))
* **custom-domains:** action menu UI, analytics button placement, delete dialog flow ([3ec72f2](https://github.com/QQuik/li2-app/commit/3ec72f2f12669a3513f62ee4204752d28c2cf623))
* **custom-domains:** cross-tenant IDOR on GET / DELETE / verify handlers ([cbcd839](https://github.com/QQuik/li2-app/commit/cbcd839f6fd765ea5659e25503187134dd0bab63)), closes [#6](https://github.com/QQuik/li2-app/issues/6)
* **custom-domains:** cross-tenant IDOR on GET / DELETE / verify handlers ([f0b4fb7](https://github.com/QQuik/li2-app/commit/f0b4fb77566e694e29272ca329356eff7a71d016)), closes [#6](https://github.com/QQuik/li2-app/issues/6)
* **custom-domains:** delete dialog loading state and conditional touchpoint table ([94f3768](https://github.com/QQuik/li2-app/commit/94f37684ae08eecef5c39acd7398df16c302e2a1))
* **custom-domains:** delete dialog loading state and conditional touchpoint table ([d89dfe1](https://github.com/QQuik/li2-app/commit/d89dfe12d5b47464aee700cae249883560ca92df))
* **custom-domains:** disable set-as-default checkbox for unverified domains in table view ([120c982](https://github.com/QQuik/li2-app/commit/120c982dc9f82ab10e450e97c7fb354135415409))
* **custom-domains:** invalidate touch-point cache on domain delete ([6e56e32](https://github.com/QQuik/li2-app/commit/6e56e32dcc6b66b6dc86596686e28168c450c033))
* **custom-domains:** invalidate touch-point cache on domain delete ([8a44546](https://github.com/QQuik/li2-app/commit/8a4454604397cfccd7fae7de7d054266023188a6))
* **custom-domains:** remove unused qr-code cache invalidation on domain delete ([43cfce7](https://github.com/QQuik/li2-app/commit/43cfce7bffc5775d66216a599c1d2da79f5b6089))
* **custom-domains:** remove unused qr-code cache invalidation on domain delete ([b809ba0](https://github.com/QQuik/li2-app/commit/b809ba004b08f16c92f5dd00656bf00ac7aabd78))
* **custom-domains:** replace LoadingMask with inline spinner in delete dialog ([d3667e5](https://github.com/QQuik/li2-app/commit/d3667e54d0d96eb10c9188af60289661cc141963))
* **custom-domains:** replace LoadingMask with inline spinner in delete dialog ([c71a5fc](https://github.com/QQuik/li2-app/commit/c71a5fcd56c7fce7bf4e6eb0c68c164fcfada48e))
* **custom-domains:** route all deletes through li2-backend to clean up Cloudflare hostname ([5a22a05](https://github.com/QQuik/li2-app/commit/5a22a0592539698fe150013f300e64596d70004c))
* **custom-domains:** route all deletes through li2-backend to clean up Cloudflare hostname ([b33320d](https://github.com/QQuik/li2-app/commit/b33320dfe87ce121d670341b2d3e6adb6e678d85))
* **custom-domains:** tooltip not showing on verifying badges ([f8a0d98](https://github.com/QQuik/li2-app/commit/f8a0d981278711a70c6001242045b66bcb5a5960))
* **custom-domains:** tooltip not showing on verifying badges ([aa4c074](https://github.com/QQuik/li2-app/commit/aa4c0746e56693d821a835dfc7ea6ef46bc3c75d))
* hide Chatwoot bubble on mobile by adding isMobile to effect deps ([e375f60](https://github.com/QQuik/li2-app/commit/e375f6023f306cd797fab03104af485e2c6c530f))
* include pino-roll in standalone output file tracing ([720f268](https://github.com/QQuik/li2-app/commit/720f268f9e5d4477e1880a3b9aa60bc48371e129))
* move outputFileTracingIncludes into experimental for Next.js 14 ([81182eb](https://github.com/QQuik/li2-app/commit/81182ebfb62f994b5ea6e7f28e8ec2e7bad81b3a))
* **onboarding:** fix mobile layout — padding, flex stacking, and scrolling ([0112dc5](https://github.com/QQuik/li2-app/commit/0112dc5777ebb1b4c269c0fe0cd609ccc5c17ba0))
* **onboarding:** fix mobile layout — padding, flex stacking, and scrolling ([4605bd2](https://github.com/QQuik/li2-app/commit/4605bd2591fde5486ecac2c52d6a9e2d7bafa5a5))
* remove add_to_cart from default WordPress conversion tracking selections ([55272e1](https://github.com/QQuik/li2-app/commit/55272e1f8f7b852dfa70351447ceb15e0fa8834a))
* resolve 35 failing tests and add parallel test job to CI ([8547736](https://github.com/QQuik/li2-app/commit/854773672340022693269e5a1a1974c893420857))
* **session-recordings:** exclude sessions missing chunk 0 from list ([e44ebab](https://github.com/QQuik/li2-app/commit/e44ebab327ad221c1dc006846a30798a86e50175))
* **session-recordings:** exclude sessions missing chunk 0 from list ([9194282](https://github.com/QQuik/li2-app/commit/9194282a5a17ae9c3c1833645adc80ba77db6af8))
* skip pino-roll file transport during next build phase ([d046459](https://github.com/QQuik/li2-app/commit/d0464598deb3a8ad75b850e7849111cd363baad4))
* **test:** add origin to window.location mock in create-organization-form test ([086bd0a](https://github.com/QQuik/li2-app/commit/086bd0a3175c9a9572f46ca6463f5fe300acb0b4))
* update is_active field to allow null values in funnel type definition ([7c6c9b3](https://github.com/QQuik/li2-app/commit/7c6c9b3e116c46de1c38f5a43c5743ef0129654c))
* update Vietnamese onboarding translation strings for behavior analytics ([b43a972](https://github.com/QQuik/li2-app/commit/b43a972fe390201f5f7d183a778ded6bf0fb3167))
* update Vietnamese onboarding translation strings for behavior analytics ([bc14b9f](https://github.com/QQuik/li2-app/commit/bc14b9fa1a1427eff99b8835a6427cb3a9ac7cdd))

### ♻️ Code Refactoring

* **custom-domains:** extract columns.tsx cells as React components ([fc59a6a](https://github.com/QQuik/li2-app/commit/fc59a6a0e7d0bf58a7ebf9a610a61ec0b932e632))
* **custom-domains:** extract columns.tsx cells as React components ([42bf55c](https://github.com/QQuik/li2-app/commit/42bf55c561071f1d443a5beeac80c36e0e6e545b))
* **deferred-attribution-stats:** clarify attribution metrics and success criteria ([f38301f](https://github.com/QQuik/li2-app/commit/f38301f1398e6a8d5fad0545164c37ee34c337a8))
* **deferred-attribution-stats:** clarify attribution metrics and success criteria ([a7bce5e](https://github.com/QQuik/li2-app/commit/a7bce5e8264236ddd729bfa65864cd46fa48c546))
* rename and recreate deep link app meta migration files and fix cron job column name typo ([860a8bb](https://github.com/QQuik/li2-app/commit/860a8bb1e3bbaaed2c9fe85ce881ef0738ac2ca7))
* simplify docker build process and implement retry logic for image push ([597455a](https://github.com/QQuik/li2-app/commit/597455ac0d6385af54291a228652da655c88d083))
* simplify docker build process and implement retry logic for image push ([8946446](https://github.com/QQuik/li2-app/commit/8946446633b8eca94d091f0dadfe811c279f022a))
* update funnel step count type and add next step name field to database schema ([4b48412](https://github.com/QQuik/li2-app/commit/4b48412b68053d021bee75cfcca48f759e5ebc21))

### 🧹 Chore

* change sidebar width ([0700cf8](https://github.com/QQuik/li2-app/commit/0700cf88f5a0faeb861f236680869de808653cb1))
* update global styles and regenerate Supabase database types ([09e7e5e](https://github.com/QQuik/li2-app/commit/09e7e5e3c0c5a7ffb8824698bc961c3a0cd6d995))
* update global styles and regenerate Supabase database types ([931aad9](https://github.com/QQuik/li2-app/commit/931aad9649a7e95eade4dbfd805dab24e425845b))

### 🎨 Code Style

* align foreground token to slate-800 and clean up dark slate overrides ([b306b99](https://github.com/QQuik/li2-app/commit/b306b990f276c8d6b0b3565d9c2abd18935a1177))
* dark theme improvements across UI components ([58e23c7](https://github.com/QQuik/li2-app/commit/58e23c7b09cf832cc62e910aca9d88244e1ed9b6))
* **event-rules:** redesign create/edit UI with two-card layout and footer actions ([924e9e5](https://github.com/QQuik/li2-app/commit/924e9e5bdd7822e50b63206baa60f44d4fbd19a5))

### 🚀 Performance Improvements

* add DB indexes for session recordings, optimize list query filtering, and fix auth middleware response handling ([8dc80b6](https://github.com/QQuik/li2-app/commit/8dc80b6ada7b4d6ad6beb3f3ac81960eb1a1cb74))
* add fingerprints canvas_fp index and disable Clarity on production ([82cbbe8](https://github.com/QQuik/li2-app/commit/82cbbe8f06b482f33443e93ed1309be21dd52a33))

### 🔧 CI/CD

* add retry logic to dev Docker build/push step ([bb024ea](https://github.com/QQuik/li2-app/commit/bb024ea5c0e2c4e5e4fd0c95fb5d55138bf6acd3))
* add retry logic to dev Docker build/push step ([49cd2e8](https://github.com/QQuik/li2-app/commit/49cd2e8a27499fa98635c005cde73acfa715a98b))
* replace docker compose build+push with docker/build-push-action@v7 ([39a1952](https://github.com/QQuik/li2-app/commit/39a19520729e02644720a8f5d89fc0450b1667bf))
* replace docker compose build+push with docker/build-push-action@v7 ([69e4038](https://github.com/QQuik/li2-app/commit/69e4038fc35ebfe60bd2536144ec17422da085a0))

## [1.25.0](https://github.com/QQuik/li2-app/compare/v1.24.1...v1.25.0) (2026-05-29)

### ✨ Features

* **i18n:** improve language handling and synchronization for React hydration ([9930d6d](https://github.com/QQuik/li2-app/commit/9930d6d61d6015ef0b08e6dc29b829651b0b578a))

## [1.24.1](https://github.com/QQuik/li2-app/compare/v1.24.0...v1.24.1) (2026-05-27)

### 🐛 Bug Fixes

* try to fix redirect error ([e730bc6](https://github.com/QQuik/li2-app/commit/e730bc6aba96a99e4eb7838de52f1f9f2bba332e))

## [1.24.0](https://github.com/QQuik/li2-app/compare/v1.23.1...v1.24.0) (2026-05-26)

### ✨ Features

* **api-keys:** migrate list to TableV2WithRef with per-cell skeleton loading ([64265c7](https://github.com/QQuik/li2-app/commit/64265c7db3b966ee8f7d1786919464c545233f43))
* **debug:** live behavior validation in setup wizard + Redis-based debug mode ([e42331a](https://github.com/QQuik/li2-app/commit/e42331a7feffeae56ea488fe1bc0a1f2cb6eb10c))
* **session-recordings:** table UX overhaul with real recording duration ([39978f8](https://github.com/QQuik/li2-app/commit/39978f8078294c365696f5d22cb17e7ca2ef3d61))
* **session-recordings:** track real recording duration from rrweb event span ([0ab77f0](https://github.com/QQuik/li2-app/commit/0ab77f08cb08d9d7797a10a191f90e4905b586eb))
* **settings:** extend quota items config and update plan permission types ([d2c8d70](https://github.com/QQuik/li2-app/commit/d2c8d701d31868847b36bd014c2cc56af0cac2ca))
* **site-analytics:** validate script button, recent-data page tree sorting, simplified demo mode ([bb9c39a](https://github.com/QQuik/li2-app/commit/bb9c39aeab8807bacece3cb7fb2595fed42141bd))
* **wizard:** auto-redirect to Site Analytics with 3s countdown on completion ([0051e29](https://github.com/QQuik/li2-app/commit/0051e290dc6bcd09d5acd22f14c2ad4914170137))

### 🐛 Bug Fixes

* **heatmap:** align scroll depth renderer with table, fix snapshot not updating on page change ([34fff6f](https://github.com/QQuik/li2-app/commit/34fff6fc23e6838af8716c13a66f4fbe5a790d50))
* **heatmap:** exact pathname match to prevent /vi matching /vi/blog ([e9992f4](https://github.com/QQuik/li2-app/commit/e9992f4a994ca58f9b26835c53ee83b7588c0a7d))
* **heatmap:** revert always-pageviews-prefilter, only use it for viewport range ([adfae32](https://github.com/QQuik/li2-app/commit/adfae328ce2cf01be6b58da54a70628ed4f7758a))
* **session-recordings:** fix pagination, duration display, and mobile-compatible player ([e51a739](https://github.com/QQuik/li2-app/commit/e51a739782d4ae7c40a00c7f93a8921b5e725d8d))

### ♻️ Code Refactoring

* **heatmap:** replace viewport pre-filter with post-sort by nearest width ([65f49f6](https://github.com/QQuik/li2-app/commit/65f49f6e0e564f8329e4bfadd18c912d4c6e6db3))

### 🧪 Tests

* add unit tests for asynq-client and verify protection against CVE-2023-36665 prototype pollution ([fc35a9f](https://github.com/QQuik/li2-app/commit/fc35a9f938275e2be8f06e5d88db9f809dcce23d))

## [1.23.1](https://github.com/QQuik/li2-app/compare/v1.23.0...v1.23.1) (2026-05-25)

### 🐛 Bug Fixes

* **heatmap:** fix page snapshot query to always pre-filter by page_path via pageviews ([6d962c7](https://github.com/QQuik/li2-app/commit/6d962c77117d8ada61523aac262f7335d6ad1bed))

## [1.23.0](https://github.com/QQuik/li2-app/compare/v1.22.0...v1.23.0) (2026-05-25)

### ✨ Features

* implement session recording quotas, add middleware observability logging, and update touchpoint creation dialog translations. ([ec29096](https://github.com/QQuik/li2-app/commit/ec29096bba6c31b072624cf00070cb242d3a247e))

### ♻️ Code Refactoring

* add audit logs to demo actions, schema updates for touch points and quotas, and implement short link creation feedback dialog ([e7b7a84](https://github.com/QQuik/li2-app/commit/e7b7a8453318ec7afdef47673de39f7c9dc2df98))

### 🧹 Chore

* update encrypted production environment variables ([77efd08](https://github.com/QQuik/li2-app/commit/77efd083e75da9ef8c73c73c4f491571afcc6054))
* update encrypted production environment variables ([3938814](https://github.com/QQuik/li2-app/commit/393881461a5a7a56412a8240211a2907cc2f817a))

## [1.22.0](https://github.com/QQuik/li2-app/compare/v1.21.1...v1.22.0) (2026-05-22)

### ✨ Features

* add RBAC permission gates to event-rule module ([33e8159](https://github.com/QQuik/li2-app/commit/33e815997d107162580937a71e045f3422ce127d))
* **api:** add public health check endpoint ([1372ff7](https://github.com/QQuik/li2-app/commit/1372ff7e44d87052308d7ddd48aa6b1b6cba9c45))
* **auth:** add admin impersonation endpoint and org summary migration ([a3dae5b](https://github.com/QQuik/li2-app/commit/a3dae5b52a139f517d3bf027091496f87b2abd7a))
* **quota:** add session recording quota schema and plan types ([7b3b973](https://github.com/QQuik/li2-app/commit/7b3b9732b0f2733332e524e2f91b1370e312eece))

### 🐛 Bug Fixes

* **auth:** use NEXT_PUBLIC_APP_BASE_URL for impersonate redirect ([c6b1ce3](https://github.com/QQuik/li2-app/commit/c6b1ce3dc0e2c1660b806ae31a41852aa3db41a8))
* **short-links:** require name in edit mode with correct min length ([6f48bd5](https://github.com/QQuik/li2-app/commit/6f48bd5985e46fc29fe5ae1b35634b88281931b0))

### ♻️ Code Refactoring

* replace legacy analytics onboarding with v2 wizard, add member leave endpoint ([b58d286](https://github.com/QQuik/li2-app/commit/b58d286f395cdab93a7a1ccc6e2388ae641f05d0))

## [1.21.1](https://github.com/QQuik/li2-app/compare/v1.21.0...v1.21.1) (2026-05-20)

### 🐛 Bug Fixes

* redirect to protectedDefaultPath after entering demo mode and clear stale org cache ([aff1fc6](https://github.com/QQuik/li2-app/commit/aff1fc69584dc7e03fd10e644c6d993aab6c19fa))

### 🧹 Chore

* update encrypted production environment variables ([01984c7](https://github.com/QQuik/li2-app/commit/01984c7b6aa92c1507e270ada107d3addc5743be))

## [1.21.0](https://github.com/QQuik/li2-app/compare/v1.20.0...v1.21.0) (2026-05-20)

### ✨ Features

* add public demo login endpoint ([d48ee14](https://github.com/QQuik/li2-app/commit/d48ee149b7bfbf1c9445c1d49d686a026256348e))

### 🐛 Bug Fixes

* lock behavior analytics onboarding steps that require prior completion ([fb89636](https://github.com/QQuik/li2-app/commit/fb896364e5f21adfe74e978c06a44719acf8886f))

## [1.20.0](https://github.com/QQuik/li2-app/compare/v1.19.2...v1.20.0) (2026-05-19)

### ✨ Features

* add "Only Owner" label to locked onboarding goal items ([fd14c6d](https://github.com/QQuik/li2-app/commit/fd14c6d834037ee9b43a31eb645d8f967d8a1bb5))

### 🛠 Updates

* onboard state now no redirect user without permission ([f6fdf8d](https://github.com/QQuik/li2-app/commit/f6fdf8d06ac96a27991dae3647911855ecca18c8))
* onboard state now no redirect user without permission ([4bcb16e](https://github.com/QQuik/li2-app/commit/4bcb16eaca20ce2f1307d86ca953dae5dcab7d9e))

## [1.19.2](https://github.com/QQuik/li2-app/compare/v1.19.1...v1.19.2) (2026-05-19)

### 🐛 Bug Fixes

* prevent TypeError when sale currency is empty string or unsupported value ([148c7a5](https://github.com/QQuik/li2-app/commit/148c7a5bc4f9afa9c0be1449ae87ac0430f8e4ea))

## [1.19.1](https://github.com/QQuik/li2-app/compare/v1.19.0...v1.19.1) (2026-05-19)

### 🐛 Bug Fixes

* remove beta badges from menu, add site-analytics plan guard, and handle org creation errors ([0b549a3](https://github.com/QQuik/li2-app/commit/0b549a3fc79c4346df53b7cebb8ba606be35500b))

## [1.19.0](https://github.com/QQuik/li2-app/compare/v1.18.3...v1.19.0) (2026-05-19)

### ✨ Features

* add analytics settings database fields, update demo script loader, and refine auth refresh error handling ([08ea897](https://github.com/QQuik/li2-app/commit/08ea8979ac428cb6c202f9a141183a861f67292f))
* add cascade delete for collections and optimize tag service deduplication, plus enhance touchpoint card UX with row click navigation ([a3b8caa](https://github.com/QQuik/li2-app/commit/a3b8caa374bb506c6c07ef5ee71c26634497f26b))
* add filtering by trigger type to event rules list and update responsive UI components ([bd3e604](https://github.com/QQuik/li2-app/commit/bd3e6042ee44ec7a660c9f68905cc7972a3a6f4c))
* add ip column to sessions table and improve replay player event handling and seek stability ([8c957af](https://github.com/QQuik/li2-app/commit/8c957af4840ba0bfc5c5c52149d5faf99338c206))
* add snapshot render for heatmap ([f6ea04f](https://github.com/QQuik/li2-app/commit/f6ea04f6c65bf7f581b9741609deee8e89a757f8))
* **ai-setup:** add AI-powered registration form detection flow ([3a67434](https://github.com/QQuik/li2-app/commit/3a6743441969c6ebd8dfdcf0d3ca6485506e0b97))
* **analytics,recordings,table:** hostname filter for forms analytics, session replay improvements, table skeleton loading ([d61df6f](https://github.com/QQuik/li2-app/commit/d61df6f983f2d20ae0f80d53c16a7451bb89e3ed))
* **analytics:** conversion guides server/client modes, WordPress dev URL, premium badge ([e5b3985](https://github.com/QQuik/li2-app/commit/e5b39850b98988850e3ee091c26ffd36c6405045))
* behavior analytics onboarding wizard and analytics settings improvements ([330e70c](https://github.com/QQuik/li2-app/commit/330e70c425a60d9cd4410acdfff26c35e3892fa2))
* **conversion:** add lead dedup cleanup + unified partial unique index ([f5955e3](https://github.com/QQuik/li2-app/commit/f5955e3b7579ff5bea8d655e21134736d3f3e7a1))
* **conversions:** add event-names API route and v2 RPC migration ([f9929ad](https://github.com/QQuik/li2-app/commit/f9929adea8a5663fc5ac936a2d1b151a97d582d3))
* **conversions:** add i18n for Direct row name and description in attribution table ([a4e8e67](https://github.com/QQuik/li2-app/commit/a4e8e674fa68608c1081908bb49e7c5e36f0a8ba))
* **conversions:** add UTM source & channel filters to conversion analytics ([38b2d33](https://github.com/QQuik/li2-app/commit/38b2d33c17bacb0ff2dad0da26623eddb22842b1))
* **conversions:** event name filter, direct attribution row, v2 RPCs ([67db144](https://github.com/QQuik/li2-app/commit/67db14499d65dd4dc8426aea6fc43d29c80d685b))
* **conversions:** render Direct leads/sales + source filter ([bebfcdb](https://github.com/QQuik/li2-app/commit/bebfcdbab750cb87491852aca0a77cebea1ff5b0))
* **conversions:** thread source filter through stats KPI cards ([eab470e](https://github.com/QQuik/li2-app/commit/eab470eed0852c5b03367b5c94efe49711b74bf0))
* **conversions:** update terminology from "Touch Point" to "Link" across multiple components and translations ([e5da748](https://github.com/QQuik/li2-app/commit/e5da7483be45fceeabffe27ffce702bbe0c292d2))
* **customers:** add customer detail v2 page with responsive layout ([7ef0d12](https://github.com/QQuik/li2-app/commit/7ef0d120e4aa5d5318c12004350cc9e7487df98e))
* **customers:** redesign customers page UI to match Figma ([769368f](https://github.com/QQuik/li2-app/commit/769368f050bceff904b6d0fe13cf3653f7286ff2))
* **domains,customers:** grey cloud notice for CNAME, customer sessions API, journey timeline ([9fb8631](https://github.com/QQuik/li2-app/commit/9fb8631bc7294f896060b2fa2712edb1919fe847))
* **i18n:** add missing direct/directDescription keys to conversions locale files ([8263812](https://github.com/QQuik/li2-app/commit/82638123abce6ede8eec833c3f6d991b9795b277))
* integrate direct traffic counts into funnel data and visualization ([b4f0e27](https://github.com/QQuik/li2-app/commit/b4f0e274cc6efb5701e93d8e26e26a3764988353))
* **nav:** replace heatmap with site-analytics in sidebar, redirect old pages ([04693bb](https://github.com/QQuik/li2-app/commit/04693bbc710dedc51d57f15149de37f817af48ca))
* **session-recordings:** add advanced filters with multi-select and debounce ([745b0ce](https://github.com/QQuik/li2-app/commit/745b0cef923dd015c93ef1a1b5056ece327c22ab))
* **session-recordings:** add session replay feature with Supabase Storage backend ([fd265e4](https://github.com/QQuik/li2-app/commit/fd265e4641fe74a917ebe93b29d97a5f68254c13))
* **session-recordings:** update components, types, and add browser/os icons ([740af25](https://github.com/QQuik/li2-app/commit/740af25af9f6e961af9a41498980907561a020ac))
* **short-link-form:** disable QR copy & download buttons in create mode ([d723160](https://github.com/QQuik/li2-app/commit/d723160b7629266e4c865d5549cc9d520d0de7ff))
* **short-links:** collection picker dialog, icon consolidation, slug history in edit mode ([35272a8](https://github.com/QQuik/li2-app/commit/35272a88fddf9aba9e728d21cf053afbc2dca53a))
* **short-links:** redesign Smart Targeting around devices and countries ([531087f](https://github.com/QQuik/li2-app/commit/531087fba19904f7c55ec303abe7a6e12caf97e8))
* **site-analytics:** add channel classification to sessions & visits ([8ce4e3d](https://github.com/QQuik/li2-app/commit/8ce4e3d4f687f50f8bd96ab68eef9a92d9735bd5))
* **site-analytics:** heatmap/scroll UX improvements and data fixes ([2d9648a](https://github.com/QQuik/li2-app/commit/2d9648a545207cc34125c3179f83e86086116ee6))
* **site-analytics:** improve page tree UX and fix scroll data for domain level ([ec18244](https://github.com/QQuik/li2-app/commit/ec182445a6038efd210b49581199c8a0453afa99))
* **site-analytics:** viewport filter for page snapshots, heatmap target height, fix overrideTypes merge ([3dcaa02](https://github.com/QQuik/li2-app/commit/3dcaa028a870c6556317e2a4eb18d0d31b429444))
* **tags:** redesign tag list and tag form dialog to match Figma ([04cde3f](https://github.com/QQuik/li2-app/commit/04cde3f809469971d18e9396ff9a83ba02e3c0ba))

### 🐛 Bug Fixes

* **dashboards:** correct ownership transfer logic and access mode handling ([53ff4c2](https://github.com/QQuik/li2-app/commit/53ff4c22c7ebbe6e2a074b35f3a0b179eb23eb40))
* handle create org errors gracefully, redirect stuck users, and auto-detect VN locale ([76c5c46](https://github.com/QQuik/li2-app/commit/76c5c46648df3a658c278dbca58d42efd9bf7fda))
* harden demo mode flow against token expiry mismatch and session loss ([cb93246](https://github.com/QQuik/li2-app/commit/cb932463bb9d09bc17c00a475b8eb06b65285e77))
* pin rrweb-snapshot to 1.1.14 to prevent mirror type error in builds ([4692ba9](https://github.com/QQuik/li2-app/commit/4692ba96a3bf425aa538cea0ea7f11827cc175a0))
* remove unused mirror instance in snapshot player rebuild process ([b57abd3](https://github.com/QQuik/li2-app/commit/b57abd33e49682c9f5392326e900e06e3b4b8eea))
* upgrade @li2/analytics to 0.8.1-alpha.0 and fix rrweb snapshot mirror param ([99cbb64](https://github.com/QQuik/li2-app/commit/99cbb64eef4677c3d2b1f11f73df7cbb6935cfd8))

### ♻️ Code Refactoring

* simplify form labels and add required indicator to tag name field in TagDialogForm ([7a308fc](https://github.com/QQuik/li2-app/commit/7a308fc0ac0cf5594851ef40bc14b37602806090))
* update funnel chart visualization logic to improve height calculation and stack proportional attribution ([acee14d](https://github.com/QQuik/li2-app/commit/acee14d09dd6b4d26f7a495f49595f3cbc533229))
* update token refresh to pass response to setCasdoorToken and redesign touchpoint card UI layout ([f4338ab](https://github.com/QQuik/li2-app/commit/f4338aba8e7298a1565a7242e155cd5a19234a8f))

### 🧹 Chore

* re-run db gens ([9a35166](https://github.com/QQuik/li2-app/commit/9a351660456672167e7e189560a24a20b5fa506e))
* remove debug console.log from funnel chart ([f9f1ec9](https://github.com/QQuik/li2-app/commit/f9f1ec97de49b0f543967d45d476d17576fd62bb))
* update encrypted production environment variables ([8bbc5a2](https://github.com/QQuik/li2-app/commit/8bbc5a2ffed082da593c489266d42cb479ae5d77))

## [1.18.3](https://github.com/QQuik/li2-app/compare/v1.18.2...v1.18.3) (2026-05-04)

### 🐛 Bug Fixes

* replace push with replace in handleGetStarted to prevent back navigation loop ([1887257](https://github.com/QQuik/li2-app/commit/1887257f98ed9d796e413bad4fd55dc6853b346b))

### 🛠 Updates

* make clickId empty if not exists for allow direct lead ([7b59c25](https://github.com/QQuik/li2-app/commit/7b59c25887b5a73c41d9e2178783f018ede7afb2))

## [1.18.2](https://github.com/QQuik/li2-app/compare/v1.18.1...v1.18.2) (2026-04-21)

### 🐛 Bug Fixes

* **dashboards:** correct ownership transfer logic and access mode handling ([#669](https://github.com/QQuik/li2-app/issues/669)) ([ab471c9](https://github.com/QQuik/li2-app/commit/ab471c9736cb29a561d6d071c61aaddfb5523ba4))

## [1.18.1](https://github.com/QQuik/li2-app/compare/v1.18.0...v1.18.1) (2026-04-21)

### 🐛 Bug Fixes

* update QR code error correction level to Q and include it in component rendering options ([6f2264e](https://github.com/QQuik/li2-app/commit/6f2264eda68a64970527453886ea2ca57b075be4))

### ♻️ Code Refactoring

* implement QR option merging logic ([080b16e](https://github.com/QQuik/li2-app/commit/080b16e9045b5b6f04cd772e60c9fb2413e89b4d))

## [1.18.0](https://github.com/QQuik/li2-app/compare/v1.17.1...v1.18.0) (2026-04-21)

### ✨ Features

* implement toolbar session authentication to enable direct site viewing for heatmaps and scroll maps ([11f6c0b](https://github.com/QQuik/li2-app/commit/11f6c0bb138be145f0f6674952a4e856d7f93ad9))

## [1.17.1](https://github.com/QQuik/li2-app/compare/v1.17.0...v1.17.1) (2026-04-20)

### 🐛 Bug Fixes

* **button:** render single child in asChild mode to satisfy Slot ([0582842](https://github.com/QQuik/li2-app/commit/0582842f25366a667dd1d64c572ae12c1eb10ffe))
* enable refetch interval for realtime interactions hook ([571ed7c](https://github.com/QQuik/li2-app/commit/571ed7cca2b914182365e36263572b8b5f820a73))

### ♻️ Code Refactoring

* add error logging for non-plan exceptions in ensureOrgPlan and reduce Redis cache TTL for user plans. ([b55402e](https://github.com/QQuik/li2-app/commit/b55402e79be23744174b1db06702db76532e0427))
* comment out settings button in short link list items ([109bd40](https://github.com/QQuik/li2-app/commit/109bd400fda9b233616ff1d83b84b99a47e10ca3))

### 🧹 Chore

* update encrypted production environment variables ([e619c1c](https://github.com/QQuik/li2-app/commit/e619c1c1e576c1a455289a814c870d4af4246e66))

## [1.17.0](https://github.com/QQuik/li2-app/compare/v1.16.0...v1.17.0) (2026-04-20)

### ✨ Features

* add API route to handle touch point image uploads for QR logos and meta-tags ([c392da6](https://github.com/QQuik/li2-app/commit/c392da682d5f9c5d709571ae34ef7fa1d042f288))
* Add demo components and content for Heatmap, Funnels, Forms Analytics, Conversions, and Link Journey features. ([76d6f65](https://github.com/QQuik/li2-app/commit/76d6f6559869d68656d1b950ce92330c05fe48b4))
* add demo mode hint to product type selector onboarding ([ea4d9a0](https://github.com/QQuik/li2-app/commit/ea4d9a04c55a75848821eddd212909f07d36b3c4))
* add hostname mutation to conversion AI tour onboarding flow ([cd34fdc](https://github.com/QQuik/li2-app/commit/cd34fdcad6b36a6b955cc3d36858974f923e24a9))
* add i18n for advanced analytics ([9f5d1b7](https://github.com/QQuik/li2-app/commit/9f5d1b7b8b1bf01d235c101466202bc2cc5e9356))
* add select_placeholder to link attribution onboarding translations ([669dc36](https://github.com/QQuik/li2-app/commit/669dc36c81e2d20b2a6489ddfd0ce68ca483cb6b))
* add site analytics & improve onboard ([#658](https://github.com/QQuik/li2-app/issues/658)) ([4d3346a](https://github.com/QQuik/li2-app/commit/4d3346aa99c6555bbaf77c765d86164ad64a6c59))
* add slug field to touch_points dropdown and update related queries ([ba0e49b](https://github.com/QQuik/li2-app/commit/ba0e49bbd3c26b004834779bbc8a955b6d604053))
* add whitespace validation to link password schema with localized error messages ([6e1c1a3](https://github.com/QQuik/li2-app/commit/6e1c1a31ef80fc07927034f6890216b868b7e2f8))
* **analytics-settings:** onboarding v2 wizard and queries update ([f5ca40d](https://github.com/QQuik/li2-app/commit/f5ca40d68380027af0593bc14af7ae85559fd2dc))
* apply orange color theme to behavior analytics wizard ([38e5b0e](https://github.com/QQuik/li2-app/commit/38e5b0e2a8bba21d683ad9c77edb55121fe1baee))
* **auth:** track GA4 sign-up event on new user registration ([9351382](https://github.com/QQuik/li2-app/commit/9351382a797cb02ad7bccc5c92820d3642626026))
* **dashboards:** add batch widget endpoint and prop-driven WidgetCard (Phase 2b, Task 2b.6) ([5677a10](https://github.com/QQuik/li2-app/commit/5677a105411f5df4ed736d572f36a3f02fa85430))
* **dashboards:** add Conversions data source with SQL-level currency conversion ([8f3ea5a](https://github.com/QQuik/li2-app/commit/8f3ea5a26eb7d9a7b077b93749f80737886bbcff))
* **dashboards:** add edit layout mode with Redis lock (Phase 2d, Tasks 2d.1–2d.4) ([080b5f1](https://github.com/QQuik/li2-app/commit/080b5f1fd35f40410cf1c02c42b300b1a293034b))
* **dashboards:** add EN/VI translations for query builder (Phase 2b, Task 2b.7) ([8d90694](https://github.com/QQuik/li2-app/commit/8d906949e65c52cc30c80f051f4038a87dfa445c))
* **dashboards:** add events data source, UTM dimensions, Zod cross-validation (Phase 2b, Task 2b.2) ([46ed7bc](https://github.com/QQuik/li2-app/commit/46ed7bc48d26b53b14943ce5758e4d540d684d86))
* **dashboards:** add frozen widgets, i18n, and E2E fixes (Phase 2c, Tasks 2c.7–2c.8) ([94608ef](https://github.com/QQuik/li2-app/commit/94608ef0d5e6d0c8412e37ca4d79f2485b6a7c72))
* **dashboards:** add generated thumbnails to template cards ([6b94266](https://github.com/QQuik/li2-app/commit/6b94266af8b177799a06c903a58eb31b406728d0))
* **dashboards:** add global date range picker (Phase 2b, Task 2b.1) ([478c2b5](https://github.com/QQuik/li2-app/commit/478c2b5b5b14a4f36d25d6472e3e059fb6baf3ae))
* **dashboards:** add i18n, saving indicator, and snap-back fix (Phase 2d, Task 2d.5) ([4b3c5df](https://github.com/QQuik/li2-app/commit/4b3c5dfd44f0a894697c8ad8d16b93d7ad30221c))
* **dashboards:** add Interactions data source + PLAN_GATE_MAP refactor ([fb5de67](https://github.com/QQuik/li2-app/commit/fb5de67959215381304f56556376a821655301e3))
* **dashboards:** add live preview, edit flow, and preview API (Phase 2b, Task 2b.4) ([f4614d7](https://github.com/QQuik/li2-app/commit/f4614d79c6a1002b3a1983b7b780250a5ac05d70))
* **dashboards:** add per-widget date override (Phase 2b, Task 2b.5) ([072c07a](https://github.com/QQuik/li2-app/commit/072c07af76a52d16049910c67820994ab3a7d654))
* **dashboards:** add query builder UI with split-panel Dialog (Phase 2b, Task 2b.3) ([5f0698e](https://github.com/QQuik/li2-app/commit/5f0698e1d2fa69cea0078b5b9aaae19ce683d846))
* **dashboards:** add role-gated UI, access badges, and transfer dialog (Phase 2c, Task 2c.6) ([827c78e](https://github.com/QQuik/li2-app/commit/827c78ef5fbf73a248884de928a1b1960340a860))
* **dashboards:** add sharing permission system and access management (Phase 2c, Tasks 2c.1–2c.5) ([1148825](https://github.com/QQuik/li2-app/commit/11488258abfb9697bea0a3166a15dce09c301b00))
* **dashboards:** complete Phase 2a Dashboard Core ([7c42c8d](https://github.com/QQuik/li2-app/commit/7c42c8d70f0f2aef1635230be8280e91b700728f))
* **dashboards:** dashboard selector dropdown — task 2e.7 ([3f504a2](https://github.com/QQuik/li2-app/commit/3f504a23927ddeb8d6de18e1c64aef48036127f5))
* **dashboards:** dashboard thumbnails + view mode toggle — Phase 3 power user features ([898c7c4](https://github.com/QQuik/li2-app/commit/898c7c4cf8627f6d81e68d0db1365f5e6fb547d7))
* **dashboards:** formula widget query builder UI + display currency ([1faebc7](https://github.com/QQuik/li2-app/commit/1faebc70dcf66233910c5b500cc71f91f2e9eaf0))
* **dashboards:** formula widget schema + execution (2e.3) ([794b512](https://github.com/QQuik/li2-app/commit/794b512a000b8b465f9a7b16d0516a0001bbdbdf))
* **dashboards:** polish detail view UI — selector, empty state, access drawer, widget builder ([60361ee](https://github.com/QQuik/li2-app/commit/60361eeca6a94189abb984a297ec68eb18ee1bde))
* **dashboards:** polish list UI/UX — search, sort, tabs, cards, create dialog ([d7cf82b](https://github.com/QQuik/li2-app/commit/d7cf82b253d926d9b2a2d9e5d01ad12c4f8f13b7))
* **dashboards:** premium polish — PRO upsell, stagger animations, success celebration ([d12e067](https://github.com/QQuik/li2-app/commit/d12e067a480a078fe6f3bcb819b834280bc9449f))
* **dashboards:** responsive query builder + access mode polish — task 2e.8 ([2d8b772](https://github.com/QQuik/li2-app/commit/2d8b77238c05cdad541c921113e69e97a344fd79))
* **dashboards:** smart defaults, auto-fill name, benefit copy, hover preview ([3809ee5](https://github.com/QQuik/li2-app/commit/3809ee58ce166cdc3c33fa8e99c1e2e4ad56b33b))
* **dashboards:** task 2e.5 — rename dashboard + widget duplicate ([a4b3a42](https://github.com/QQuik/li2-app/commit/a4b3a4280ad2a4594039ea97053a68cc9e16b4cc))
* **dashboards:** task 2e.6 — dashboard list polish (tabs, pin, "+" card) ([eba16a4](https://github.com/QQuik/li2-app/commit/eba16a4f77670b571fe8bc068713ad891d991b49))
* **dashboards:** warm & approachable detail view polish ([7308835](https://github.com/QQuik/li2-app/commit/7308835906f7bb6b761253332d31f1488f8a6fcd))
* enforce a 10-link submission limit in PasteLinkHeader and display warning when exceeded ([c5d8929](https://github.com/QQuik/li2-app/commit/c5d8929f1a5f5e340ee2bc2627b1064c01ba647e))
* **event-rule-repo:** add optional source param to create() ([a099ba2](https://github.com/QQuik/li2-app/commit/a099ba26cde71b861b826dfb6c507359692fdb86))
* **event-rule-service:** pass source param through to repository ([ab56307](https://github.com/QQuik/li2-app/commit/ab56307c8c871c026125085a9c3722c006e9f674))
* **funnel-repo:** add optional source param to create() ([c87f0de](https://github.com/QQuik/li2-app/commit/c87f0de5709e2a033fb3131cf7d7099f6965b77b))
* **funnel-service:** pass source param through to repository ([21fd2dd](https://github.com/QQuik/li2-app/commit/21fd2ddeeb81b1e145e9cfb79b004c01ac37d79d))
* **funnels:** contextual empty states with auto-polling for funnel report ([7c06aab](https://github.com/QQuik/li2-app/commit/7c06aab0da45055a1088b5810b3b2103011943c5))
* **i18n:** add EN/VI translations for advanced analytics overview components ([4737753](https://github.com/QQuik/li2-app/commit/473775378374d18ff83688f30d34354eeb65d37e))
* **i18n:** localize v2 onboarding wizard (en + vi) ([15e0f8b](https://github.com/QQuik/li2-app/commit/15e0f8b36231024556f705c2f170ca47a8a2e93f))
* Implement "Get Started" intro flows for Heatmap, Link Journey, Conversions, Funnels, and Forms Analytics. ([f53a081](https://github.com/QQuik/li2-app/commit/f53a0810ac95a3dbbf2841b42eeb86c724501582))
* implement AI-powered conversion tracking setup with automated page analysis and script generation ([f36656c](https://github.com/QQuik/li2-app/commit/f36656cac73cbf0dd6117e8b76e0058491e5f3fc))
* implement new onboardflow & update sidebar ([426994f](https://github.com/QQuik/li2-app/commit/426994fdeb82278a70d6573181f369ee19b47626))
* include short_code in touch-point search queries ([85ce6be](https://github.com/QQuik/li2-app/commit/85ce6be268f28722f28b6ec982bf089f0ce319b9))
* Introduce a demo mode feature with server actions, client hooks, and UI for entering and exiting. ([82df234](https://github.com/QQuik/li2-app/commit/82df234de3a2436473fb2573a5494058fa98fe41))
* **layout:** add compact mode to ContentLayout and refactor onboarding step padding ([02f1b86](https://github.com/QQuik/li2-app/commit/02f1b864df64f4cbb443ad5f7420fa0765536a31))
* manual conversion guide + behavior activity setup in v2 onboarding ([37fb9ce](https://github.com/QQuik/li2-app/commit/37fb9ce18f4f927a8b4161e4655879413e716f29))
* mark analytics and automation menu items as beta ([3b872d9](https://github.com/QQuik/li2-app/commit/3b872d94bf416a1bd5acf73d940cf2e309f8c359))
* **navbar:** add org selector to header, responsive layout tweaks ([ec91fd7](https://github.com/QQuik/li2-app/commit/ec91fd749f7718b7034ed181e7c546a412bb4f3b))
* **org:** enforce max_orgs limit with upgrade CTA; move custom-domains above short-links in sidebar ([46c6a08](https://github.com/QQuik/li2-app/commit/46c6a084fd2287ab088ce68f2c2df49ac9ad05a6))
* **overview-dashboards:** expand widget/dashboard templates + ProBadge ([cbbdafb](https://github.com/QQuik/li2-app/commit/cbbdafbe4f231d730aff65be548edcec950a0d77))
* **overview-dashboards:** i18n keys + E2E polish + access-denied UX ([54efc46](https://github.com/QQuik/li2-app/commit/54efc46fffcbee243eb8d500cb99ee00a5d3cc5e))
* **overview:** add all Overview UI components (trend chart, columns, plan footer) ([c4b7487](https://github.com/QQuik/li2-app/commit/c4b7487168cb550e6de9f75d167a5570b2e8efac))
* **overview:** add API route and query hook ([a0fe871](https://github.com/QQuik/li2-app/commit/a0fe871706fe8931bdbd1fe295cac37a89f1b7f9))
* **overview:** add get_overview_data RPC function ([3f17611](https://github.com/QQuik/li2-app/commit/3f17611ad06a354b13c019f345a31d06ab1c00dc))
* **overview:** add page route, i18n, and update sidebar navigation ([4c3f6f7](https://github.com/QQuik/li2-app/commit/4c3f6f7b2ba89e56f0ee1e15d6138504ff62cfb0))
* **overview:** add types and color constants ([8db81f8](https://github.com/QQuik/li2-app/commit/8db81f8210042e236397a9a8c03b60f086d14cf0))
* **realtime:** activate real-time dashboard with hero metrics, top links, and polished UI ([f7f72bf](https://github.com/QQuik/li2-app/commit/f7f72bfc490fcbe237a0b14ed4a2ad46a2953b6f))
* redirect to onboarding after organization creation ([c8cc286](https://github.com/QQuik/li2-app/commit/c8cc286f7150129c3edf2f03023ea49c8c8ae914))
* reorder realtime clicks menu item in sidebar navigation ([3e06b34](https://github.com/QQuik/li2-app/commit/3e06b3463de1725c865b5b9788fe04dbca8018b0))
* search by name or slug, export with current filters, import CSV template ([519cd5e](https://github.com/QQuik/li2-app/commit/519cd5e3ace6d47ca9d10ce9d5e1c33e46549df1))
* **short-link-form:** add QR download/copy buttons and fix nested form issue ([df4c859](https://github.com/QQuik/li2-app/commit/df4c8594c72bd48bc53185915f42e6fee09dfcd4))
* **short-link-list:** sync feature icons with sidebar and expand feature flags ([3f878a3](https://github.com/QQuik/li2-app/commit/3f878a3248cc260632ad076a910380abb1270747))
* **short-links:** add ShortLinkDetailHeader component ([0c90227](https://github.com/QQuik/li2-app/commit/0c90227ac14832d582a2d28948fcda31535a6906))
* **short-links:** enrich detail endpoint with conversion_summary ([7738d72](https://github.com/QQuik/li2-app/commit/7738d7224c7747c30d04d12b15d571ec2b75a250))
* **short-links:** polish list UI, add empty state, and sync i18n keys ([#664](https://github.com/QQuik/li2-app/issues/664)) ([e59c8a0](https://github.com/QQuik/li2-app/commit/e59c8a0aab8daaf385de982aba42de4b945ece53))
* **short-links:** smart targeting tab, animated panels, QR download in row actions ([aaa9ffc](https://github.com/QQuik/li2-app/commit/aaa9ffce8cd6a2c466c626c65cee55e08cfe3fcc))
* **sidebar:** remove org selector from sidebar, adjust sidebar trigger position ([debedcb](https://github.com/QQuik/li2-app/commit/debedcb90f420c5f90111825c92e6c1502f2b8bb))
* **smart-setup:** add AI badge and suggestion CTA to funnel and event rule cards ([39efed1](https://github.com/QQuik/li2-app/commit/39efed14729da38b70ca128a4a2e27874d0c5691))
* **smart-setup:** add AI badge and trigger button components ([70ce168](https://github.com/QQuik/li2-app/commit/70ce1685051a89c5d685f99481deba9f28c21195))
* **smart-setup:** add all matching criteria fields to frontend EventRuleSuggestion type ([40d7dcd](https://github.com/QQuik/li2-app/commit/40d7dcdfb6d99b237ca509248a8d5b9239cbdceb))
* **smart-setup:** add all trigger type fields to EventRuleSuggestion type ([324e0be](https://github.com/QQuik/li2-app/commit/324e0bee3540804ab52a9e9b131f1a8aa609d089))
* **smart-setup:** add analyze, apply, and status API routes ([830ddfa](https://github.com/QQuik/li2-app/commit/830ddfa23bb07421fd93740c9563669596d929da))
* **smart-setup:** add anthropic sdk and cheerio dependencies ([eba922a](https://github.com/QQuik/li2-app/commit/eba922a8ff9231c51c1db4b4b37a8adb8e454ac2))
* **smart-setup:** add cache table and source columns migration ([a330219](https://github.com/QQuik/li2-app/commit/a330219c09261b77ea13abded173d44c0051fa27))
* **smart-setup:** add Claude API client module with tool definitions ([a326362](https://github.com/QQuik/li2-app/commit/a32636237765ab922046fdbfaee2427fe0100ca1))
* **smart-setup:** add exists prop to suggestion cards ([98f9b33](https://github.com/QQuik/li2-app/commit/98f9b3367b8b45cd312d41c03cf645ced9c17137))
* **smart-setup:** add frontend types and TanStack Query hooks ([95087fc](https://github.com/QQuik/li2-app/commit/95087fceb89d6498d23369c262a830634d941be3))
* **smart-setup:** add HTML preprocessor for Claude input ([6997d8c](https://github.com/QQuik/li2-app/commit/6997d8c4ace808b0eb0c37e1664aaa667c37f266))
* **smart-setup:** add i18n strings for en and vi ([a595752](https://github.com/QQuik/li2-app/commit/a595752e17e4734c1c96a51f86a7594cab1c9078))
* **smart-setup:** add main results page component ([ba7000b](https://github.com/QQuik/li2-app/commit/ba7000bcf5cbb8c526f5bd493950a3c048f37e58))
* **smart-setup:** add service and repository layers ([4a5bd33](https://github.com/QQuik/li2-app/commit/4a5bd33e1208a3ad20a76b1eefd303b289f4527e))
* **smart-setup:** add suggestion cards and loading components ([a469642](https://github.com/QQuik/li2-app/commit/a469642d5ea8f36936445f49d809d5164af72984))
* **smart-setup:** expand Claude tool schema with all 4 trigger types and matching criteria ([520e4d3](https://github.com/QQuik/li2-app/commit/520e4d30ecd3930421557a2eb4ebb98bce8309f4))
* **smart-setup:** extend ApplyResponse with skipped counts ([2cb1e06](https://github.com/QQuik/li2-app/commit/2cb1e062a469c9c6c2796f48607ece1a5c0778d5))
* **smart-setup:** integrate Smart Setup step into onboarding wizard ([24860d7](https://github.com/QQuik/li2-app/commit/24860d770cb5e4c5189b81c765d4eb6b702ce259))
* **smart-setup:** pass all matching criteria fields when applying event rule suggestions ([e4ef0c5](https://github.com/QQuik/li2-app/commit/e4ef0c5dec98a90526549e7599aa65850b42871b))
* **smart-setup:** show 'Already exists' badges and disable existing suggestions ([606583e](https://github.com/QQuik/li2-app/commit/606583e7533993ef225f09d9cb5ce09cc1c579a1))
* **smart-setup:** show skipped item counts in apply success state ([3284770](https://github.com/QQuik/li2-app/commit/3284770292c407418aa1f3e3b292a12cb5394ed9))
* **smart-setup:** skip existing items in apply() for idempotency ([b5da4f8](https://github.com/QQuik/li2-app/commit/b5da4f87fea2829d9a82b7ed05cd2048c2de4bb6))
* update onboard state for link attribution & behavior tracking ([0f62616](https://github.com/QQuik/li2-app/commit/0f62616ffea91bacb1b7886b90c921109932110b))
* update premium access restrictions for analytics and customer menu items ([3b588d7](https://github.com/QQuik/li2-app/commit/3b588d7e8bf5497ce3f5d7e71181a6d93940c06e))
* **utm-templates:** implement delete endpoint and clean up utm-section ([9f28276](https://github.com/QQuik/li2-app/commit/9f28276cd071c0b6f7e7c081d5c8d367e667122a))
* **wordpress-onboarding:** mark plugin store install as coming soon ([27e04b7](https://github.com/QQuik/li2-app/commit/27e04b7f2318361d642643bc19b7d07bd14be475))

### 🐛 Bug Fixes

* add BOM to CSV export blob to ensure correct encoding in Excel ([d1d9a84](https://github.com/QQuik/li2-app/commit/d1d9a84c63a7ea265bc9af656f696bf483c012a2))
* add dependency warnings for event rules required by funnel steps ([011145a](https://github.com/QQuik/li2-app/commit/011145a2405a3c262a1be893ffea62acdf74cc48))
* add maxLength constraints to Claude tool schemas for output safety ([75ded6e](https://github.com/QQuik/li2-app/commit/75ded6ebbc07ceaeef1cf2a19f6cd7d55f716621))
* add output sanitization to detect prompt leak and anomalous suggestions ([31de058](https://github.com/QQuik/li2-app/commit/31de058da327ec3294258223c98b606877278d5a))
* adjust sidebar media query for high-DPI scaling and derive edit mode from URL parameters in encrypted link section ([678af8f](https://github.com/QQuik/li2-app/commit/678af8f0c4892428274807b84e16a3b89476d798))
* align visit count display in funnel step columns ([ccdb5d1](https://github.com/QQuik/li2-app/commit/ccdb5d15fc67256ceaaaee46586d8dedb0beb02e))
* **auth:** await async calls in tracking and profile update logic ([e4775e6](https://github.com/QQuik/li2-app/commit/e4775e6aa93d62535388bdf130d3599cc48192c1))
* collection_id not saved on short-link update ([86adee9](https://github.com/QQuik/li2-app/commit/86adee9e78dab945c148a330e9d1e1617858deaf))
* **dashboards:** code review cleanup — infinite loop, i18n, bulk insert, plan error helper ([6c5c8bd](https://github.com/QQuik/li2-app/commit/6c5c8bd824b519fa90bc1821e4be8dc81646edbc))
* **dashboards:** fix transforms labels  widget render ([a990227](https://github.com/QQuik/li2-app/commit/a99022732d70e40017bb96a752af023ba4105049))
* **dashboards:** security & stability review for list bulk actions — Phase 3 polish ([24a2236](https://github.com/QQuik/li2-app/commit/24a2236449bc9c6295397edfdec5cd2fb3322ce8))
* **donut-chart:** show all items in list with scroll instead of grouping into Others ([d9b8cec](https://github.com/QQuik/li2-app/commit/d9b8cec678a7fd3c788aa58f0b32a7e3d707e67e))
* **dynamic-targeting:** stop nested form submit propagation; handle empty arrays in PATCH; parse stringified JSON in schema ([87fcb2e](https://github.com/QQuik/li2-app/commit/87fcb2e0c5284b2f857c6a3166e49490c06335c2))
* **event-rules:** pass trigger_type and form fields to edit form, add funnel-event sync prompt ([c7e69a5](https://github.com/QQuik/li2-app/commit/c7e69a5143a3151768d25be129fea450e9cb1e1c))
* force server-computed typeNumber for QR codes to support longer URLs ([ddbfbec](https://github.com/QQuik/li2-app/commit/ddbfbec1c5fbc958d0e57c7b13aab02838be98d0))
* handle utm_tags, tracking, and slug check in short-link form ([253d93b](https://github.com/QQuik/li2-app/commit/253d93badbb03c2fb885ef49c68320c51bc52c83))
* harden Claude prompt with XML delimiters and anti-injection directive ([3bbcffd](https://github.com/QQuik/li2-app/commit/3bbcffd8f2f40f579747bfe35eea7c1c75263512))
* onboard ([0e28421](https://github.com/QQuik/li2-app/commit/0e284218ceaae09e395a6e0bb9decf156cf38106))
* only get org's roles & global role in roles api ([50a21a0](https://github.com/QQuik/li2-app/commit/50a21a04659a79ffd9ebd9ee0e96e71c8d8d644b))
* **overview:** cast _organization_id to text for visits/touch_points tables ([1a579aa](https://github.com/QQuik/li2-app/commit/1a579aaaa4af244867f774d4a358e629ad0e9825))
* **overview:** change _collection_ids to uuid[], remove _user_id::text cast ([f424cc4](https://github.com/QQuik/li2-app/commit/f424cc4f5f390e8c67d85fee60cd9ff14f67debc))
* **overview:** change RPC params to text type, fix all column type casts ([35d58c8](https://github.com/QQuik/li2-app/commit/35d58c8678341e041d2f347c3c128704ceebccf7))
* **overview:** correct RPC param name and type cast ([effe1b6](https://github.com/QQuik/li2-app/commit/effe1b63a3c522bd7dfb677a918203a17f4959d5))
* **overview:** fix i18n keys, rate calculations, chart X-axis ([49671e7](https://github.com/QQuik/li2-app/commit/49671e726747df2b3ba7219930082eeef44e47da))
* **overview:** fix TS errors — named export, RPC type assertion ([80bf4cf](https://github.com/QQuik/li2-app/commit/80bf4cf64c766e19c6db792a85dc4ea15d901f99))
* **overview:** revert RPC params to uuid — all org_id columns are uuid ([f95adeb](https://github.com/QQuik/li2-app/commit/f95adeb229ec037fd0d61d460ee63559a2faacf5))
* **overview:** use ensurePolicy for VIEW_DASHBOARD (no-scope permission) ([7857958](https://github.com/QQuik/li2-app/commit/7857958bfcc5fa190346eabde850f5a062a4b757))
* remove using of redis from edge-runtime ([3a5b54b](https://github.com/QQuik/li2-app/commit/3a5b54be59aecd03d1c82f5410a8c91861318104))
* separate page metadata from untrusted HTML in Claude prompt ([f07ef26](https://github.com/QQuik/li2-app/commit/f07ef2681af3b391790029acc5776ea0ab34d790))
* **short-link-form:** hide E2EE toggle in edit mode, reset on create unmount ([a4b43ae](https://github.com/QQuik/li2-app/commit/a4b43ae2b92046a04cd3b249c3f6505d87cca97c))
* **short-links:** properly handle null expiration dates and track form dirty state ([5fdc827](https://github.com/QQuik/li2-app/commit/5fdc8276070f717e302b847b3fafc132aac4e878))
* show paused event rule status in funnel report and form ([dbd1cc4](https://github.com/QQuik/li2-app/commit/dbd1cc488314d01c1839f4beeb09ceb6437dd5ed))
* **smart-setup:** show actual API error message instead of status code ([71144a6](https://github.com/QQuik/li2-app/commit/71144a6ae7a4e66652160dfa747e47f0b7ef3fe0))
* **smart-setup:** use orgCreditService instead of duplicated credit logic ([92192c1](https://github.com/QQuik/li2-app/commit/92192c1288a9532f61c65bad8b2aa9bc9918d2a9))
* strip HTML comments from preprocessed content to prevent prompt injection ([f83f30a](https://github.com/QQuik/li2-app/commit/f83f30a184eb37a9958a2282d8783ab5b8e6264b))
* strip template, object, embed tags from preprocessed HTML ([de02990](https://github.com/QQuik/li2-app/commit/de02990fb2f9ccd38d9c0da0469e6229d0525310))
* **ui:** add Portal to HoverCard to prevent overflow clipping ([c7d6705](https://github.com/QQuik/li2-app/commit/c7d6705df4a01e219a8fefb4aa9d722ff2ee5056))
* use attribute allowlist instead of denylist to reduce prompt injection surface ([6fedf2e](https://github.com/QQuik/li2-app/commit/6fedf2e026219f7a92832c306204c9035fcefb15))
* **verify-script:** resolve TS narrowing error on status === 'waiting' inside hasResult block ([b42509e](https://github.com/QQuik/li2-app/commit/b42509e0060e72d7111fdaf797d0ef2a1a58ec9a))

### 🛠 Updates

* add blocking UI for plan feature ([f2a0443](https://github.com/QQuik/li2-app/commit/f2a0443d13a3acd157acf51716123a00bf61f5e7))
* **i18n:** add translate for funnels, link journey, heatmap, event-rules, form analytics,.. ([2170d5a](https://github.com/QQuik/li2-app/commit/2170d5a2c6dbd051bbca3fb220cbf301af9f51af))
* link journey block ui ([7abd00e](https://github.com/QQuik/li2-app/commit/7abd00ec4c8bbb3222097d34dddcd07a8a52879f))

### ♻️ Code Refactoring

* centralize PRICING_URL constant + replace hardcoded pricing hrefs ([864dc48](https://github.com/QQuik/li2-app/commit/864dc488864b9f3c8dea2b312f4f5edb457ecc98))
* consolidate and archive supabase migration files into backup directories and add migration management script ([2f404a3](https://github.com/QQuik/li2-app/commit/2f404a317128b6f5b02b7015ddf6c8f0f864c4b8))
* extract demo banner from navbar, reorganize sidebar menu ([3d86c96](https://github.com/QQuik/li2-app/commit/3d86c9650e98b20f52fa6b9c10137e08c291121f))
* extract SOURCE_AI_SUGGESTION constant, align source param pattern ([7ebfdad](https://github.com/QQuik/li2-app/commit/7ebfdad85f0687d7190bc968e47409e49e0734bf))
* normalize organization root path to overview and update middleware routing ([3d94d55](https://github.com/QQuik/li2-app/commit/3d94d5595f7e21a4457e682c07326fbeb5bdcdd8))
* remove rule type selection from create event rule dialog ([1b510b5](https://github.com/QQuik/li2-app/commit/1b510b50c4b11f0dc40d9d7bde265886870534f9))
* **smart-setup:** align repo and service singleton with codebase convention ([ab0c427](https://github.com/QQuik/li2-app/commit/ab0c4277afa423fd9d204419d7772385f69295fc))
* **smart-setup:** delegate to funnel/event-rule services ([b25005d](https://github.com/QQuik/li2-app/commit/b25005d19c96ed440c085538583656616b78f0cd))
* **smart-setup:** simplify code from review findings ([1175633](https://github.com/QQuik/li2-app/commit/1175633c38686bfcd9a63172b03dee224d959ce1))
* update feature flag derivation logic to include additional properties for short-link columns ([0bac1f4](https://github.com/QQuik/li2-app/commit/0bac1f4b7506cb63f41b5d7dece7e92c9e1e79a2))
* update overview components for improved usability and styling ([c7e0b76](https://github.com/QQuik/li2-app/commit/c7e0b766015de4dc950b9eda0b1b81696ecba7ba))

### 🧹 Chore

* clean up old test ([0e60699](https://github.com/QQuik/li2-app/commit/0e606994de5b25386d1b94adcd308aa432978475))
* create backup of auth callback route file ([353598e](https://github.com/QQuik/li2-app/commit/353598e970d09571a0fe13b68078294c86a8af83))
* **env:** update encrypted env ([dc9e995](https://github.com/QQuik/li2-app/commit/dc9e995d77cca8cfcf4417097852ac7ce3e38482))
* fix tsc error ([833c75d](https://github.com/QQuik/li2-app/commit/833c75d46ff900045f33d2f8ffe86a5c350688ef))
* misc fixes across shared components and schemas ([f20334f](https://github.com/QQuik/li2-app/commit/f20334fd406b8a34485693e34737169c46dd306c))
* move overview migration to supabase/migrations/overview/ ([007fde6](https://github.com/QQuik/li2-app/commit/007fde6f39deda246c3874ac5cfc1381a1f8f6b6))
* re-add gitnexus skill ([8f19818](https://github.com/QQuik/li2-app/commit/8f19818646e5850c59fca5e671c86df5bb6c1e27))
* sync db schemas ([8bf5f24](https://github.com/QQuik/li2-app/commit/8bf5f24d4d189e97e68528ff148a25d011836624))
* up env ([d62fea6](https://github.com/QQuik/li2-app/commit/d62fea6d9884bcacff67d7d2ef6eb4275c60f393))
* update text for product selector ([ae56071](https://github.com/QQuik/li2-app/commit/ae56071b59da99fd8df4aea29287cf5660884c2b))

### 🧪 Tests

* add baseline tests for HTML preprocessor ([6d36d60](https://github.com/QQuik/li2-app/commit/6d36d60f93a52f7d0cf86a4e1d8db1d6f93bba0c))
* **ms-clarity:** add snippet ([88e9aa2](https://github.com/QQuik/li2-app/commit/88e9aa271612ffd3a5df39fa21bda9588c4c517e))
* **smart-setup:** add new field logging and trigger type coverage to test script ([6f7bc69](https://github.com/QQuik/li2-app/commit/6f7bc69750a243c822aa26cc609b841d9ffd529c))

## [1.16.0](https://github.com/QQuik/li2-app/compare/v1.15.0...v1.16.0) (2026-04-10)

### ✨ Features

* redirect disabled feature pages to dashboard ([f921666](https://github.com/QQuik/li2-app/commit/f9216667ea532d8e56b562e71ddefe77d07294c7))

## [1.15.0](https://github.com/QQuik/li2-app/compare/v1.14.1...v1.15.0) (2026-04-10)

### ✨ Features

* hide Link Journey, Heatmap, Form Analytics from sidebar via env flags ([766ca18](https://github.com/QQuik/li2-app/commit/766ca18de000a076e05a00e175aa7ce5ac7dc089))

## [1.14.1](https://github.com/QQuik/li2-app/compare/v1.14.0...v1.14.1) (2026-03-27)

### 🐛 Bug Fixes

* only get org's roles & global role in roles api ([7e7933d](https://github.com/QQuik/li2-app/commit/7e7933dd7471ce82b50171dc12ed958910b168ac))

## [1.14.0](https://github.com/QQuik/li2-app/compare/v1.13.0...v1.14.0) (2026-03-24)

### ✨ Features

* Add a direct link to the WordPress analytics settings page using the site's origin URL. ([9d8ae38](https://github.com/QQuik/li2-app/commit/9d8ae384f570ac1bf1499236a98b7a27959f552d))
* add anonymous customer merge UI and database migration ([#619](https://github.com/QQuik/li2-app/issues/619)) ([4866b10](https://github.com/QQuik/li2-app/commit/4866b10b4fece62a846f2a525d94d79ec0865820))
* add Canny SSO integration and fix redirect URL encoding ([e7f6d57](https://github.com/QQuik/li2-app/commit/e7f6d577bc14843bc2ebf8e123207797f2c40079))
* add form & upgrade tag on site ([a0a1546](https://github.com/QQuik/li2-app/commit/a0a1546688d20a113044acb7e2a2ca4777ad558f))
* add form tracking ([4d0b3aa](https://github.com/QQuik/li2-app/commit/4d0b3aa84f795bff7047ee70e0a4c2840bb32c14))
* add Google Safe Browsing API v5 client with Redis caching ([d066f3a](https://github.com/QQuik/li2-app/commit/d066f3a2249ffa06bb109e785f24b1bbf57bd1fa))
* add safety enforcement UI, server-side guards, and i18n for flagged links ([03abfb5](https://github.com/QQuik/li2-app/commit/03abfb5629aeaed20d1c8114d08fa61784a3fd91))
* add safety_status column and safety_violations table for Google Safe Browsing integration ([87edbf4](https://github.com/QQuik/li2-app/commit/87edbf4f6177d92d910045ef7a9ffa9ebbe120d7))
* add TOUCHPOINT_SAFETY_VIOLATION notification type with Google attribution ([6a31b3b](https://github.com/QQuik/li2-app/commit/6a31b3b98edaa8d7031269b2dfb39bf6b03a797e))
* Add WordPress analytics integration steps and introduce confetti for celebratory UI. ([5355465](https://github.com/QQuik/li2-app/commit/53554657e82ca99f77bcc6bffbc7a0fb2ac8ab0d))
* Add WordPress site URL validation and admin accessibility check to analytics setup wizard. ([6c80bde](https://github.com/QQuik/li2-app/commit/6c80bde096fd22b15d77761382adcd9cd8b32d1f))
* Allow optional `data_collection_rules` in analytics settings creation and simplify heatmap query parameter handling. ([665efa4](https://github.com/QQuik/li2-app/commit/665efa4919411b5a7592c68f2e865effa2090cca))
* **analytics-settings:** add environment-aware JavaScript snippet with debug attributes ([1b0c826](https://github.com/QQuik/li2-app/commit/1b0c826819c9796d68e0deafa71906ab407e4fb1))
* **analytics-settings:** add trackEvent and identify methods to JavaScript snippet, update manual event examples ([0dc058d](https://github.com/QQuik/li2-app/commit/0dc058d4d57579bc53718112a09369cd1f2894c3))
* **analytics:** add database schema for landing page analytics ([6d51e1e](https://github.com/QQuik/li2-app/commit/6d51e1e492fc3871887c3477a173f6365975c376))
* **conversion:** add auto tracking via UI config ([d7dafc3](https://github.com/QQuik/li2-app/commit/d7dafc382e832f170ad29f5278d705c4acbaa5ce))
* **customers:** add metadata display in journey timeline with popover ([be98d3f](https://github.com/QQuik/li2-app/commit/be98d3f7c65864d950839f35b4d13da5671b5771))
* **customers:** display metadata in conversion history events ([3a7e894](https://github.com/QQuik/li2-app/commit/3a7e894d8ece06c14d0cf95d676b4089dcd938f3))
* **customers:** show metadata in customer profile ([d7e80c0](https://github.com/QQuik/li2-app/commit/d7e80c0fea8fa3dbd6d42379776867fc0a081c29))
* **demo:** add SpeedNet demo v2 with Docker deployment and Li2 Analytics integration ([030edf6](https://github.com/QQuik/li2-app/commit/030edf678faf5ac10ed2f82e886431462522d636))
* Enable direct download for the WordPress plugin zip file. ([0a5591e](https://github.com/QQuik/li2-app/commit/0a5591eb882e1ca757b693c92487fc38f5ced7da))
* **event-rules:** Phase 16 Event Rules MVP - complete ([8a9a957](https://github.com/QQuik/li2-app/commit/8a9a95732327418f72521dda572e8405ab5c5a22))
* **event-tracking:** add event funnel steps to frontend engine and UI ([ac469a1](https://github.com/QQuik/li2-app/commit/ac469a146b1742df5e398b4967168a79245b7c49))
* **funnel-engine:** add "in" condition with multi-select UI ([3257ac1](https://github.com/QQuik/li2-app/commit/3257ac180e3b52f2b4aad19fd89d33a770b3b7a9))
* **funnel-engine:** add link and conversion step types for cross-world funnels ([956a22a](https://github.com/QQuik/li2-app/commit/956a22a86c23c3ce8ba66d140846be61aba762ae))
* **funnel-report:** add collapsible step details table ([6b825e2](https://github.com/QQuik/li2-app/commit/6b825e27e4cecdf059e8fde8e92ecaf8175543a2))
* **funnel-report:** add drop-off insight card with severity detection ([f78b9e7](https://github.com/QQuik/li2-app/commit/f78b9e710321170dc0c37a40cad3369773035cd3))
* **funnel-report:** add funnel report page with chart visualization ([e887c56](https://github.com/QQuik/li2-app/commit/e887c56a9b56c6ef975a1930e3266bd5e619c760))
* **funnel-ui:** add funnel creation form with create/edit/delete flows ([397133d](https://github.com/QQuik/li2-app/commit/397133d386c3c5f6c2648f1597db73287732b6fa))
* **funnel-ui:** implement funnel list view page ([9bdf026](https://github.com/QQuik/li2-app/commit/9bdf0264f2ce8efd31172d221637d86ce92a685f))
* **funnels:** add event name validation warnings in funnel builder and report ([2707b9d](https://github.com/QQuik/li2-app/commit/2707b9d82a7a5d7190ed40c7b3aab85f178658c9))
* **heatmap:** add "View on site" button for SDK toolbar overlay ([f097769](https://github.com/QQuik/li2-app/commit/f097769bd691ddcca1715c430880b476b57faf57))
* **heatmap:** add aggregation API with RPC functions and Next.js routes ([c35f2f0](https://github.com/QQuik/li2-app/commit/c35f2f070fe8383daddfc979247f55d07087dee3))
* **heatmap:** add canvas renderer with dual-mode iframe/fallback ([aad7358](https://github.com/QQuik/li2-app/commit/aad7358f7ecca7a17d277cf2934dc0ba51e08511))
* **heatmap:** add device-aware preview widths for iframe and canvas ([1b767f6](https://github.com/QQuik/li2-app/commit/1b767f6199d768666e2bda05df55849799639d8b))
* **heatmap:** add heatmap page UI with controls, sidebar nav, and i18n ([22e17c1](https://github.com/QQuik/li2-app/commit/22e17c19615e4f672120bedd2fd6741197810b18))
* **heatmap:** enable scripts in iframe sandbox for page preview ([a0a9e13](https://github.com/QQuik/li2-app/commit/a0a9e13b7313812a0c7a6784132b226ebe154a4a))
* **heatmap:** implement embeddable URL check and enhance toolbar session handling ([f19dd89](https://github.com/QQuik/li2-app/commit/f19dd899dc1ac0ac68d40e75a4ea8fa34a5e1508))
* Implement analytics settings setup wizard and debug mode with new API routes and demo updates. ([710be79](https://github.com/QQuik/li2-app/commit/710be79309fa9ffebbad3724487aff54e9fa78c2))
* implement data collection rules for analytics settings, including auto-collect options and a new API route ([a70c14a](https://github.com/QQuik/li2-app/commit/a70c14ae101e7e9a9b8d676a0c47d40afd97fdbe))
* Implement scroll heatmap tracking and visualization. ([ae0a510](https://github.com/QQuik/li2-app/commit/ae0a510ef56b06995c28fc6c3bbe5db8acf36b89))
* implement url check with app settings from admin page ([6558150](https://github.com/QQuik/li2-app/commit/6558150cf5c8e390a691fe9730a3fffda3f7029f))
* Implement V2 analytics setup wizard with new tag installation and conversion guides. ([fb3523a](https://github.com/QQuik/li2-app/commit/fb3523a508da1a1f60b462173372fbc8354a7cfa))
* integrate Safe Browsing as Layer 3 in validateUrls pipeline ([54cf435](https://github.com/QQuik/li2-app/commit/54cf435de0f66c08854722392a73143b113179c8))
* Introduce advanced analytics, touch point management, and core infrastructure enhancements. ([87a9df9](https://github.com/QQuik/li2-app/commit/87a9df97b6156ea30ef59ad8a19e004842ae8c95))
* **link-journey:** complete Link Journey feature with deep dive links ([9a768c3](https://github.com/QQuik/li2-app/commit/9a768c30f992d76cbee8cdbc4c869796befe0663))
* **meta-tags:** add Facebook OG cache invalidation and update warnings ([f214882](https://github.com/QQuik/li2-app/commit/f21488201d17735cd79b378a1af00c797f1b1e48))
* **partition:** add partition maintenance cronjob migration ([520cbca](https://github.com/QQuik/li2-app/commit/520cbca61ccacfe594712792a98e2b8abd0dec08))
* **phase-10:** add interactions table schema and event_name column ([1eaea76](https://github.com/QQuik/li2-app/commit/1eaea762052aec95040df2478a8998f53685e81b))
* **phase-9:** add funnel queue infra, trigger integration, and fix period_end filter ([ece2c53](https://github.com/QQuik/li2-app/commit/ece2c531d35ff844e6be155ffaee22f8e2db325d))
* **rage-click:** add rage click summary RPC, API route, and dashboard UI ([49f04db](https://github.com/QQuik/li2-app/commit/49f04db3cc6a709d5626b25febf34fde5025ea06))
* refactor Canny integration and improve sidebar layout structure ([55f40b4](https://github.com/QQuik/li2-app/commit/55f40b478cf6f941203cc0b28e535674fd8d1e3b))
* **roles:** standardize API response format and add debug logging ([e820f20](https://github.com/QQuik/li2-app/commit/e820f2090cdd9ab04951fe7500f980fd5e966ebd))
* **toolbar:** dashboard integration for visual tagger ([c7429f7](https://github.com/QQuik/li2-app/commit/c7429f79d6ab84c8954a32d2ab67e531805b298a))
* **touch-points:** add tooltip translations and improve UI consistency ([4ace8db](https://github.com/QQuik/li2-app/commit/4ace8dbbcc59c73e73f1607bb24ed950c4a34081))
* **touch-points:** add touch point detail footer and custom switch components ([1c5381f](https://github.com/QQuik/li2-app/commit/1c5381fe40c4b5bc8d682886cdd62dcc00e3d5b0))
* **visitor-detail:** add visitor detail panel with session timeline ([d37352c](https://github.com/QQuik/li2-app/commit/d37352cbd82ba3a33f183c465b60646af1be5b15))
* **visitor-detail:** add visitor drill-down for funnel steps ([2a089df](https://github.com/QQuik/li2-app/commit/2a089dfc3b6e10619aa9389b87f90fb4ee0bd271))

### 🐛 Bug Fixes

* add httpOnly flag to cookies in production to prevent XSS token theft ([d7d399a](https://github.com/QQuik/li2-app/commit/d7d399afb83198e35810b8cea1fe9084a2d61c4a))
* add RBAC permission checks to analytics-settings, api-keys, and org PATCH routes ([85451bc](https://github.com/QQuik/li2-app/commit/85451bc0a5bfcca3884e15333c8b0f6884dce82b))
* currency mismatch ([d171f78](https://github.com/QQuik/li2-app/commit/d171f78ad0a794ff6edd85fe429199208951a305))
* distinguish missing events from funnel ordering in step warnings ([875a4a2](https://github.com/QQuik/li2-app/commit/875a4a2216222a92860c26c2b79fcde02acd521e))
* enforce is_required=true on first/last funnel steps after reorder ([1e5d526](https://github.com/QQuik/li2-app/commit/1e5d5261acace1a1da9abd24c0ab36f307e8bba4))
* error that make api response wrong type ([58f50ae](https://github.com/QQuik/li2-app/commit/58f50ae126ea4fe9e31dd1a1a9ca949820d3baf8))
* fix error that cant get roles ([a7408d7](https://github.com/QQuik/li2-app/commit/a7408d71a5014d661feabd71c8ac1afa983ad052))
* fix qr render with download and copy capabilities. ([8f9e824](https://github.com/QQuik/li2-app/commit/8f9e8243bce7d9ee19a3aa695f972325dcdfbc24))
* **funnels:** add funnel-aware pageview sorting to prevent event consumption by page steps ([e07f005](https://github.com/QQuik/li2-app/commit/e07f00583ebd3f6d69348513fc13b1c6289d0b97))
* **funnels:** guard first/last steps as required, fix is_required defaults, add help tooltip ([3d153d8](https://github.com/QQuik/li2-app/commit/3d153d85cb396785bd637cab5489bff9b6d935c2))
* **heatmap:** add allow-scripts to iframe sandbox for proper page rendering ([f3f4f00](https://github.com/QQuik/li2-app/commit/f3f4f0025d4989b8f9bf7c550f2b7fd62e3f0c19))
* **heatmap:** hostname filtering, coordinate normalization, and responsive scaling ([b90fc44](https://github.com/QQuik/li2-app/commit/b90fc444991e642618ebd252b7309e4ea994b7f1))
* make workflow build image take and env. ([8679ff4](https://github.com/QQuik/li2-app/commit/8679ff414c36922cc335b151c8765924293c5fb5))
* merge conflict ([983c988](https://github.com/QQuik/li2-app/commit/983c988d6d807e52b50fb7e7882abb68588a05de))
* meta_tag error ([2029cc8](https://github.com/QQuik/li2-app/commit/2029cc892bc9200cb9df7c0d3de787a46d276508))
* optional funnel steps scan forward in client-side walk algorithm ([47f5963](https://github.com/QQuik/li2-app/commit/47f5963134f11ca38947f24699dc2bacd0ae93fb))
* org name overflow ([276f535](https://github.com/QQuik/li2-app/commit/276f53577599c00ddd5d23e5b1f3645dde0b09c6))
* remove integration tests, update audit log retrieval to use RPC, adjust audit log data structures, and enhance unit test mocks and assertions. ([66dc93c](https://github.com/QQuik/li2-app/commit/66dc93c84272906772c7f33dbd39e30f967694d6))
* Set is_required to true by default for funnel steps to align with frontend behavior ([146946a](https://github.com/QQuik/li2-app/commit/146946a2d1de9293a6dcbef7cb4641458024820b))
* show error state instead of misleading empty state in event rules list ([d8022fd](https://github.com/QQuik/li2-app/commit/d8022fd9041d83660017e502087b24c68658ae19))
* show org message & schema matching db rule ([30cc0fc](https://github.com/QQuik/li2-app/commit/30cc0fcd40f74e8f3dbdcb23c430a7bd1e30f9f3))
* switch Safe Browsing client to protobuf decoder for v5 urls.search ([ae903f3](https://github.com/QQuik/li2-app/commit/ae903f3fee05833e4c7d8df3b1e4bb86944e2ed5))
* use useRouter().push instead of redirect() in error page client handler ([2188d8a](https://github.com/QQuik/li2-app/commit/2188d8a19eff52f6e743cf917aabebc4388464ca))

### 🛠 Updates

* add role permissions ([e7942d7](https://github.com/QQuik/li2-app/commit/e7942d7f001ecd796780b7143ad3d6f272539f59))
* dashboard create link/qr form ([93f7702](https://github.com/QQuik/li2-app/commit/93f7702c9585a619dbbcb324897d5e88c40f7e7d))
* ui styling for canny & update locale for chatwoot ([b5a2655](https://github.com/QQuik/li2-app/commit/b5a26552f4fb57f4457b4a52dec517d7434ee212))

### ♻️ Code Refactoring

* **api:** improve error handling in dropdowns route ([cad66aa](https://github.com/QQuik/li2-app/commit/cad66aa5badde509b2130c0cdb916814f2c55984))
* **api:** migrate auth routes to use withAuth wrapper ([ab06cdd](https://github.com/QQuik/li2-app/commit/ab06cddb80667349d809e36ba01eec507bb191d1))
* change api to use withAuth wrapper ([e0ec5c6](https://github.com/QQuik/li2-app/commit/e0ec5c68e6636e98ad9d12808e91d43c43587a07))
* extract SafetyFlaggedBadge component, fix N+1 in collection remove ([13fd82f](https://github.com/QQuik/li2-app/commit/13fd82f7a232c1c9c3fd9ff5b42034fef4eea50a))
* **menu:** comment out campaigns menu item from sidebar navigation ([e09688b](https://github.com/QQuik/li2-app/commit/e09688bd7c196ed67d05bcd462d376306456a664))
* **notifications:** add SYSTEM_NOTIFICATION type and clean up notification handling ([41fed66](https://github.com/QQuik/li2-app/commit/41fed6672047ee24d5bee75c757f87e59c9d717e))
* relocate touch point and notification types and hooks to feature-specific directories and rename `useIsomorphicLayoutEffect` hook. ([0553122](https://github.com/QQuik/li2-app/commit/05531229dbecc516efeb1e19401c34ea92274dad))
* Replace Button component with a directly styled anchor tag for the download link. ([67395bb](https://github.com/QQuik/li2-app/commit/67395bb85cdbf8f5900ab5ae089b2e1ff03eddd6))
* replace hardcoded color values with Tailwind CSS classes for improved UI consistency and remove an unused icon import. ([651e1f4](https://github.com/QQuik/li2-app/commit/651e1f4278579b0a2b10e3ce92c5b49c60236c1d))
* **roles:** remove debug logging from roles API endpoint ([d8dd2b8](https://github.com/QQuik/li2-app/commit/d8dd2b87cab4b3334c1d4f10f5b477340be73847))
* **touch-points:** improve slug validation UI and meta preview layout ([b0936c2](https://github.com/QQuik/li2-app/commit/b0936c2aa3a7ed25dd9e54dbb3aacc854efba3df))
* **touch-points:** move slug limit warning from tooltip to form description ([1291b57](https://github.com/QQuik/li2-app/commit/1291b575aa446dfa1d1d55d5ce51c605928cfb98))

### 🧹 Chore

* add demo ([1154143](https://github.com/QQuik/li2-app/commit/11541432bf37c19adee6d35911c267e02a496cb4))
* comment for dev ([8c57d43](https://github.com/QQuik/li2-app/commit/8c57d43964ca0e03bad5feebd863be5b73970c49))
* **release:** 1.10.1 [skip ci] ([0e1a77f](https://github.com/QQuik/li2-app/commit/0e1a77f73bbc2088457f0a122a3d54e388d59d4f))
* update encrypted development environment variables ([57823a5](https://github.com/QQuik/li2-app/commit/57823a59b126141b0850cd056387ac9c01195a0f))
* update encrypted development environment variables ([ea7cc7f](https://github.com/QQuik/li2-app/commit/ea7cc7fa58242f5d02e39db25eb858e0eac86831))
* update encrypted development environment variables and refactor touch point creation ([5619fef](https://github.com/QQuik/li2-app/commit/5619fefbcd70232f1178ddc1fcb8295fc5c42e94))
* update gitignore ([3108328](https://github.com/QQuik/li2-app/commit/31083284187d58f6a73dc3ca424545476ede5c96))
* Update production environment variables. ([d609b62](https://github.com/QQuik/li2-app/commit/d609b62e2fb9dcc62fd9d0fefbc70c12c139d00f))

### 🎨 Code Style

* update ui for qr-static-list & create, and filters item ([e381964](https://github.com/QQuik/li2-app/commit/e381964468e5c4020986132f407c066f83f83f15))

### 🧪 Tests

* **funnel-report:** add 44 component tests for funnel report UI ([19028f8](https://github.com/QQuik/li2-app/commit/19028f80ce44dd2a17d0aef42888ac3c4ddc5252))
* **heatmap:** add unit tests for color ramp and Gaussian kernel ([4462be1](https://github.com/QQuik/li2-app/commit/4462be1cae3cd7ecce69cb572dcb770bad43fa32))
* **step-matching:** add 28 unit tests for client-side funnel walk algorithm ([be42f5e](https://github.com/QQuik/li2-app/commit/be42f5e9143868d01d1b1ae135152192d94d741c))

## [1.13.0](https://github.com/QQuik/li2-app/compare/v1.12.0...v1.13.0) (2026-03-18)

### ✨ Features

- now user got ban cant go to our app ([38684ec](https://github.com/QQuik/li2-app/commit/38684ec41d2a40b2d1689e7904b0ec3e82708999))

## [1.12.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.11.4...v1.12.0) (2026-02-24)

### ✨ Features

- **meta-tags:** add Facebook OG cache invalidation and update warnings ([18b7457](https://github.com/QQuik/quik_proximity_marketing/commit/18b74577f0c450e01d8d3d4ed2cae6a5f0988071))

## [1.11.4](https://github.com/QQuik/quik_proximity_marketing/compare/v1.11.3...v1.11.4) (2026-02-05)

### 🐛 Bug Fixes

- missing permission key ([5f836ab](https://github.com/QQuik/quik_proximity_marketing/commit/5f836ab7a5f7844c53cd87e7441e5edf39d8de0f))

## [1.11.3](https://github.com/QQuik/quik_proximity_marketing/compare/v1.11.2...v1.11.3) (2026-02-05)

### 🐛 Bug Fixes

- Update menu item enablement permission key from `MANAGE_ORGANIZATION` to `MANAGE_DOMAINS`. ([0bbf175](https://github.com/QQuik/quik_proximity_marketing/commit/0bbf17529ba98473e79f49331d94bbcfee725e8b))

## [1.11.2](https://github.com/QQuik/quik_proximity_marketing/compare/v1.11.1...v1.11.2) (2026-02-05)

### 🐛 Bug Fixes

- prevent re-accessing setup page after org slug is set and revalidate path on successful setup ([5b56397](https://github.com/QQuik/quik_proximity_marketing/commit/5b563975f803ba94bf767dcc937514a22f11bdf0))

## [1.11.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.11.0...v1.11.1) (2026-02-05)

### 🐛 Bug Fixes

- show org message & schema matching db rule ([84dd333](https://github.com/QQuik/quik_proximity_marketing/commit/84dd333acb4270b5276b90be653a865c480f8bd8))

### 🧹 Chore

- update next.js to 14.2.35 for DoS security patch ([b59082f](https://github.com/QQuik/quik_proximity_marketing/commit/b59082fe9f37b10f006d5e61e23dcceac3625888))

## [1.11.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.10.1...v1.11.0) (2026-02-03)

### ✨ Features

- add GA4 tracking for sign-up success event and update auth service to include avatar ([a7020cc](https://github.com/QQuik/quik_proximity_marketing/commit/a7020cc9698ade9781f8b9bce98d0cf389ed8495))

## [1.10.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.10.0...v1.10.1) (2026-01-29)

### 🐛 Bug Fixes

- org name overflow ([f347ff4](https://github.com/QQuik/quik_proximity_marketing/commit/f347ff4ef2fb1f079d50c0307cf8a8d3ccfaa070))

## [1.10.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.9.0...v1.10.0) (2026-01-28)

### ✨ Features

- add analytics settings management for organizations ([030859b](https://github.com/QQuik/quik_proximity_marketing/commit/030859b55a79650906f102ea0b169a5782fc1801))
- add API Keys management section to Developer settings ([#606](https://github.com/QQuik/quik_proximity_marketing/issues/606)) ([9d398d7](https://github.com/QQuik/quik_proximity_marketing/commit/9d398d7604d62fb23937a2eb9eb20c077f711dfd))
- add audit logging for API keys and improve analytics integration docs ([7b20146](https://github.com/QQuik/quik_proximity_marketing/commit/7b20146a413ae0dc0001788cde08ad1cb3fcf721))
- add comprehensive JSDoc documentation to API key service and improve UI clarity ([1adc90b](https://github.com/QQuik/quik_proximity_marketing/commit/1adc90b5d4f37e96e5503fd36ba81340baccfc07))
- add conversion funnel visualization with filtering ([e85702c](https://github.com/QQuik/quik_proximity_marketing/commit/e85702c47a60ef54bd7b2a4ba972bc499f471753))
- add customer detail sheet and touchpoint attribution cards ([5ed2a69](https://github.com/QQuik/quik_proximity_marketing/commit/5ed2a695f85531f4cc30e2d922aac8ba5650bb67))
- add installation snippet feature for conversion tracking ([c9621df](https://github.com/QQuik/quik_proximity_marketing/commit/c9621dfd101dd41a0ae6ea8c1cfd40e703d0adc0))
- add interaction type into filter of analytic page ([39b81e6](https://github.com/QQuik/quik_proximity_marketing/commit/39b81e61ebfcd9494f4218fb897dc23d2e379fe3))
- add multi-currency support for conversion stats ([9c660b9](https://github.com/QQuik/quik_proximity_marketing/commit/9c660b93341d6dbb43ec6f86be6fe5936fe927ce))
- add NFC empty state with contact options and improve subdomain claiming UI ([d3019b4](https://github.com/QQuik/quik_proximity_marketing/commit/d3019b4ac08f2fa076a121cf1d278985ae509203))
- add NFC support across analytics, dashboard, and realtime features with improved i18n ([e785393](https://github.com/QQuik/quik_proximity_marketing/commit/e785393dfd2cbc54ac3b2097872d89ffb74d7205))
- add NFC tags section with routing, i18n support, and export functionality ([755a746](https://github.com/QQuik/quik_proximity_marketing/commit/755a74623d59530cbca9b9da6154e69d2b14830d))
- add per-currency revenue tracking for customers ([83344e3](https://github.com/QQuik/quik_proximity_marketing/commit/83344e39c72fa3ffea282cd0369571e36a9b774c))
- add responsive tab labels with i18n support for touch point form ([14d6b25](https://github.com/QQuik/quik_proximity_marketing/commit/14d6b2548877b33568f60e362bd31c4b9ec9c55b))
- add SQL functions for analytics ranking queries, refactor css & update UI ([#601](https://github.com/QQuik/quik_proximity_marketing/issues/601)) ([f94b505](https://github.com/QQuik/quik_proximity_marketing/commit/f94b505107f6801ec317746ec6c836ae9ec49c75))
- add static QR code tab to simple touch point form with conditional rendering ([dabb272](https://github.com/QQuik/quik_proximity_marketing/commit/dabb27288b31a061ebf98e0a32126025508f057c))
- add subdomain claiming feature with domain selection modal and i18n support ([#595](https://github.com/QQuik/quik_proximity_marketing/issues/595)) ([8bcc6c0](https://github.com/QQuik/quik_proximity_marketing/commit/8bcc6c0f576ad3f32cb1c0bd8620521920027666))
- add UTM parameters to touch point data structure and export functionality ([9a82c7e](https://github.com/QQuik/quik_proximity_marketing/commit/9a82c7ec49c0e99a91dc1bc649f068202711f045))
- **analytics:** fix touchpoint filtering logic in ranking functions and repository singleton ([16918da](https://github.com/QQuik/quik_proximity_marketing/commit/16918da8c5b5e05b120fa3d6b6379dbacebe1a6a))
- centralize Redis key management and add Docker security configuration ([e13d278](https://github.com/QQuik/quik_proximity_marketing/commit/e13d2781ca3a81d598b367fb8206a85a7a626b11))
- connect funnel filters to conversion events list ([807a475](https://github.com/QQuik/quik_proximity_marketing/commit/807a47533b587ddf160c08e4bfe94c39ad1e4cf0))
- **conversion-tracking:** add conversion tracking feature with UI components and backend support ([cfbd14c](https://github.com/QQuik/quik_proximity_marketing/commit/cfbd14c21d7ff6ff61f764ab1a9e6d128ade1466))
- **conversions:** enhance conversion filters with unified filter system and comprehensive filtering options ([6bcd9a7](https://github.com/QQuik/quik_proximity_marketing/commit/6bcd9a7f951a77393126aa940a55c38f76271ad2))
- **conversions:** enhance conversion stats and funnel components with filtering options ([fee2052](https://github.com/QQuik/quik_proximity_marketing/commit/fee2052dec0a164376e9a6080748853bb7132f2d))
- **conversions:** enhance conversion stats and funnel components with filtering options ([7c934fa](https://github.com/QQuik/quik_proximity_marketing/commit/7c934fa632bf72cd27f870e54e6f511aa699a9eb))
- **conversions:** implement tag and collection filtering with enhanced touchpoint data selection ([b44ef06](https://github.com/QQuik/quik_proximity_marketing/commit/b44ef066d207a3b48b67aa800d2a7c800e7404f6))
- **conversions:** migrate conversion stats and funnel to RPC functions with permission-based filtering ([c9bf7b9](https://github.com/QQuik/quik_proximity_marketing/commit/c9bf7b91c786bdc8fdc08613c7c4f69fada81b58))
- **conversions:** migrate touchpoint attribution to RPC function with permission-based filtering ([136080c](https://github.com/QQuik/quik_proximity_marketing/commit/136080c436699e01710f43e2359599e7fc6c2385))
- **conversions:** standardize filter parameters across conversion endpoints and components ([a204145](https://github.com/QQuik/quik_proximity_marketing/commit/a204145a1c2b1cdf6ccd77c623a39576b5457b8f))
- **customers:** add country filtering and export functionality for customer data ([1b3644f](https://github.com/QQuik/quik_proximity_marketing/commit/1b3644f799d9de99a386dcb27ef5fd463f61a046))
- **customers:** add direct sale handling and localization for customer columns ([f7f70ae](https://github.com/QQuik/quik_proximity_marketing/commit/f7f70ae3f92030dd5ec7a56d7df128666d0e08c4))
- **customers:** enhance customer detail view with additional information and routing ([973add7](https://github.com/QQuik/quik_proximity_marketing/commit/973add7334319ee3e535da5daef1bfc181f4e8f3))
- **customers:** enhance customer detail view with external ID label and touch points linking ([6c9905e](https://github.com/QQuik/quik_proximity_marketing/commit/6c9905e9a8c94e931af3065bcdfdd0e0c3d00f38))
- enable collection name import ([dad5d01](https://github.com/QQuik/quik_proximity_marketing/commit/dad5d0189452953047f90387cff7a9c28210ae9b))
- enhance conversion tracking with sales and revenue statistics ([059de5b](https://github.com/QQuik/quik_proximity_marketing/commit/059de5bd921c37811ddfc81fa51e3403309d2136))
- enhance customer journey tracking with device and location info ([baa89af](https://github.com/QQuik/quik_proximity_marketing/commit/baa89af14518518394272c05506c238a92d31bcb))
- implement subdomain claiming with database integration and improve domain verification logic ([f783531](https://github.com/QQuik/quik_proximity_marketing/commit/f7835315369f4dd1336a04b6222441b147724bb7))
- improve analytics UI sizing and layout consistency ([407b797](https://github.com/QQuik/quik_proximity_marketing/commit/407b797808cb5bef76ca4f3b09ab1bba3c2b9a3c))
- improve audit logs UI and add UTM template tracking ([05eb4d0](https://github.com/QQuik/quik_proximity_marketing/commit/05eb4d069986c659a3286b5c1803d3fbbba4a03f))
- improve publishable key UI with tabbed installation guides and enhanced key management ([420a11e](https://github.com/QQuik/quik_proximity_marketing/commit/420a11edf12a20e5467d1a0ed3c3666ee0a3d600))
- move currency setting to Developer > Conversion Settings ([e3a11ac](https://github.com/QQuik/quik_proximity_marketing/commit/e3a11ac780c37030f9138a77dcbc0407cf7cd44a))
- optimize touch point export data transformation by pre-filtering columns ([da4c96e](https://github.com/QQuik/quik_proximity_marketing/commit/da4c96e0daa07116c113929a961e9c0d7d7aa8d6))
- redesign UTM template cards with improved layout and spacing ([55d6115](https://github.com/QQuik/quik_proximity_marketing/commit/55d6115190b3536a50a3071864dd530a0a594ef8))
- redesign UTM template forms with improved UX and help tooltips ([7cdc4a0](https://github.com/QQuik/quik_proximity_marketing/commit/7cdc4a0ead557a4aec9459194b463ae4c749c4e8))
- refactor audit logs UI and improve analytics styling ([40c0079](https://github.com/QQuik/quik_proximity_marketing/commit/40c0079c9441ef65df0c799091d39ef01cac6437))
- remove setParams on default searchFilter hook ([59045a6](https://github.com/QQuik/quik_proximity_marketing/commit/59045a6c3044314edc8a88a20421630f62e71971))
- standardize tab styling across analytics ranking components ([75ce92a](https://github.com/QQuik/quik_proximity_marketing/commit/75ce92aeeec6572290a071af35ca979ef757f33f))
- standardize typography and styling across analytics components ([ffe5862](https://github.com/QQuik/quik_proximity_marketing/commit/ffe5862302a0f91b5b4a575e5e2c298952eef8fa))

### 🐛 Bug Fixes

- **auth:** update RouteHandler type to include Response in promise return type ([c45e06d](https://github.com/QQuik/quik_proximity_marketing/commit/c45e06dfdc176e2d67bf74877476a7d7a49b6e9e))
- change slug mapping cookie delimiter from hyphen to colon ([7ed0fff](https://github.com/QQuik/quik_proximity_marketing/commit/7ed0fffaa31a33941fff80aedc15186412a9bf9d))
- **conversion:** conversion event table got error when empty tp filter ([5f306e9](https://github.com/QQuik/quik_proximity_marketing/commit/5f306e946f05d2d88bc5130955eb899e0f1009aa))
- **conversion:** refine filters handling in findAllConversions and skip customers without first_click_id ([6ed706b](https://github.com/QQuik/quik_proximity_marketing/commit/6ed706b389c621ddb92709d5e7b23e9c8255c781))
- date filter on export links not work ([a5cff5b](https://github.com/QQuik/quik_proximity_marketing/commit/a5cff5bc21a8f42fab8539c0ed11b08294c5f857))
- db schemas ([b9ec3c8](https://github.com/QQuik/quik_proximity_marketing/commit/b9ec3c8af4f9adc6407c502a094cf1fffeade48c))
- db scheme ([a0b9bad](https://github.com/QQuik/quik_proximity_marketing/commit/a0b9badd7b1031e895f84b9058ac3de6ec55fda4))
- **dependencies:** temp disable Globe until fix perf ([d2e2079](https://github.com/QQuik/quik_proximity_marketing/commit/d2e207981f45f154f6bd0d72ddf10d1174fe64ae))
- disable space export/import ([2f7f92c](https://github.com/QQuik/quik_proximity_marketing/commit/2f7f92cfce076febf4508a86b171119cfdf26399))
- error that cant call server action to get result & make org-select not prefetch orgs for optimize performance ([5bd24e4](https://github.com/QQuik/quik_proximity_marketing/commit/5bd24e4eee99ae836928c1568be3ea7f5d4af3d3))
- extend BaseRepository in ExchangeRateRepository ([92fbce6](https://github.com/QQuik/quik_proximity_marketing/commit/92fbce618b2fcd6573f6b1f2e2c4a36f0872e373)), closes [PR#604](https://github.com/QQuik/PR/issues/604)
- improve NFC UI/UX and add plan-based access control ([ec1869d](https://github.com/QQuik/quik_proximity_marketing/commit/ec1869dd94e9ad74cd43a3a9cfc00bf47e36fff7))
- **organization-popover:** improve invite members navigation with pathname-based routing ([fc756c3](https://github.com/QQuik/quik_proximity_marketing/commit/fc756c334c64db1b2e33e4cc60f8980d4dcc8ec7))
- pagination bug ([2ff1d5b](https://github.com/QQuik/quik_proximity_marketing/commit/2ff1d5b0e8be9f7bbe11853ddef673c4d2566f4d))
- **permissions:** api keys will have own permission now ([2c64beb](https://github.com/QQuik/quik_proximity_marketing/commit/2c64beb5e9f50a29a94dd46e9da5ae00a01da51c))
- plan & permission error in org slug path ([2db738e](https://github.com/QQuik/quik_proximity_marketing/commit/2db738e68b214579fbf9240a3121936e498cf4e0))
- prevent authenticated users from accessing auth routes (login, register, callback) ([85377b8](https://github.com/QQuik/quik_proximity_marketing/commit/85377b863fd0d09472ec6cd8968bdca7bc60ee4c))
- react query got id instead of slug ([53fd514](https://github.com/QQuik/quik_proximity_marketing/commit/53fd51454c7782306210108dfb4d46431c4261ec))
- remove database lookup for organization slug in middleware and refactor slug validation schema ([744c8a0](https://github.com/QQuik/quik_proximity_marketing/commit/744c8a0f3ab547c075dd7f62ab16f36211494a8a))
- **sidebar:** adjust organization popover position for mobile & show user nav button ([06e591e](https://github.com/QQuik/quik_proximity_marketing/commit/06e591ecfb502d02aed66b4cdcfdccdf299814ee))
- static qr data length limit & default analytic excluded bot ([16efd12](https://github.com/QQuik/quik_proximity_marketing/commit/16efd12c451bc32d871933b0d4e671c16f22a222))

### 🛠 Updates

- add conversion funnel click event & space analytic button ([4faa5b3](https://github.com/QQuik/quik_proximity_marketing/commit/4faa5b3973c9359f716bb16ff6a1102158abeb71))
- add exclude bot default to true for all data ([e72cac9](https://github.com/QQuik/quik_proximity_marketing/commit/e72cac94b694dd1c2742a1f39cdbbbd142a1da4a))
- **ai-provider:** change Gemini model to gemini-flash-lite-latest ([98a705e](https://github.com/QQuik/quik_proximity_marketing/commit/98a705e0568f35c778062c8d7e02adbc16e6a864))
- **conversion:** update i18n for conversion page ([6571acd](https://github.com/QQuik/quik_proximity_marketing/commit/6571acd753997fb7b6d3ecff3df784ba8a4be847))
- **i18n:** add organization popover & profile settings translations ([e1db972](https://github.com/QQuik/quik_proximity_marketing/commit/e1db9720f06d95b7aefcf0a52d8a85d9fb2f1208))
- move customers list to separate page ([890f23b](https://github.com/QQuik/quik_proximity_marketing/commit/890f23b2840e6e3baa39cd6bffda63e46eda0359))
- move menu item ([317499f](https://github.com/QQuik/quik_proximity_marketing/commit/317499f5720985bef6c984ea3b9762b68cacfa31))
- plan & feature in ui (PRX-326) ([74d97f5](https://github.com/QQuik/quik_proximity_marketing/commit/74d97f5b299f6e6f0b53718dd11069a6c3268370))

### ♻️ Code Refactoring

- **layout:** try to fix layout breaking on iPhone ([62264c9](https://github.com/QQuik/quik_proximity_marketing/commit/62264c96540a0923f5b3c71a74dcd00253f6f37c))
- standardize settings section IDs and improve hash navigation ([a82d601](https://github.com/QQuik/quik_proximity_marketing/commit/a82d601c1d173f286beae5b6d7040f4c6cb6a575))

### 🧹 Chore

- add doc ([bba111e](https://github.com/QQuik/quik_proximity_marketing/commit/bba111eb89553a24b6db3af125c0baad7452d198))
- add migration script ([1c8c25a](https://github.com/QQuik/quik_proximity_marketing/commit/1c8c25a0fc02b39ccbca289a9358b248f2c05aca))
- add paths-ignore when deploy ([070bcdc](https://github.com/QQuik/quik_proximity_marketing/commit/070bcdc0dd1a2923ecbe6b667f9646862de928be))
- enable source map for dev ([8e03b76](https://github.com/QQuik/quik_proximity_marketing/commit/8e03b76eaf1949409723f06dabebd6bb8a1bb304))
- remove some unuse colors ([c0e3325](https://github.com/QQuik/quik_proximity_marketing/commit/c0e3325733aa323f8dcd3e30412104f355c634db))

### 🎨 Code Style

- fix text overflow in smart targeting rule block ([7ba6b1c](https://github.com/QQuik/quik_proximity_marketing/commit/7ba6b1cce41366c51eace48748aca87da379fae7))

## [1.9.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.8.0...v1.9.0) (2026-01-16)

### ✨ Features

- add li2 tracking ([bc07795](https://github.com/QQuik/quik_proximity_marketing/commit/bc07795cd7e655eea43661928e7addfb42221b0e))
- add production environment check to Dub tracking ([51a055d](https://github.com/QQuik/quik_proximity_marketing/commit/51a055d49b816e357e0fe3b7eec0cc7114afadf3))
- migrate li2 tracking to official SDK ([cab26ed](https://github.com/QQuik/quik_proximity_marketing/commit/cab26ed0d21c8502304ec0366a4f59ca03231b53))

## [1.8.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.7.0...v1.8.0) (2026-01-13)

### ✨ Features

- add Facebook Conversions API tracking for sign-up events ([9432170](https://github.com/QQuik/quik_proximity_marketing/commit/94321703180dea347579e4106188e1907ccfb7a8))

## [1.7.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.6.0...v1.7.0) (2026-01-05)

### ✨ Features

- add Dub tracking integration for sign-up events and click attribution ([830549c](https://github.com/QQuik/quik_proximity_marketing/commit/830549c0d3c7b701737ed49be1a2ea6abfa23c2e))
- add Dub tracking support to registration page with conditional client-side rendering ([4b7f744](https://github.com/QQuik/quik_proximity_marketing/commit/4b7f7440dd47638093658de63bd831fe1771a3c0))
- configure Dub analytics to track outbound links for li2.ai domains ([9f6f359](https://github.com/QQuik/quik_proximity_marketing/commit/9f6f35934acfa8f1c25827fb24411240d9e0e750))
- move DubProvider to html element for earlier tracking initialization ([8dbaebb](https://github.com/QQuik/quik_proximity_marketing/commit/8dbaebb4421fc4e0d7cbc85be36849a5e8fd5832))

### 🧹 Chore

- **release:** 1.7.0 [skip ci] ([7373434](https://github.com/QQuik/quik_proximity_marketing/commit/73734348e224f8a86eaf9a4dee11459c36543b0e))
- **release:** 1.7.0 [skip ci] ([6312c33](https://github.com/QQuik/quik_proximity_marketing/commit/6312c33dfa02d42255d987d58991eb48236c975a))
- **release:** 1.7.0 [skip ci] ([96b6ba5](https://github.com/QQuik/quik_proximity_marketing/commit/96b6ba554178f21b5105e7a2cd65399677401108))

## [1.7.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.6.0...v1.7.0) (2026-01-05)

### ✨ Features

- add Dub tracking integration for sign-up events and click attribution ([830549c](https://github.com/QQuik/quik_proximity_marketing/commit/830549c0d3c7b701737ed49be1a2ea6abfa23c2e))
- add Dub tracking support to registration page with conditional client-side rendering ([4b7f744](https://github.com/QQuik/quik_proximity_marketing/commit/4b7f7440dd47638093658de63bd831fe1771a3c0))
- configure Dub analytics to track outbound links for li2.ai domains ([9f6f359](https://github.com/QQuik/quik_proximity_marketing/commit/9f6f35934acfa8f1c25827fb24411240d9e0e750))
- move DubProvider to html element for earlier tracking initialization ([8dbaebb](https://github.com/QQuik/quik_proximity_marketing/commit/8dbaebb4421fc4e0d7cbc85be36849a5e8fd5832))

### 🧹 Chore

- **release:** 1.7.0 [skip ci] ([6312c33](https://github.com/QQuik/quik_proximity_marketing/commit/6312c33dfa02d42255d987d58991eb48236c975a))
- **release:** 1.7.0 [skip ci] ([96b6ba5](https://github.com/QQuik/quik_proximity_marketing/commit/96b6ba554178f21b5105e7a2cd65399677401108))

## [1.7.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.6.0...v1.7.0) (2026-01-05)

### ✨ Features

- add Dub tracking integration for sign-up events and click attribution ([830549c](https://github.com/QQuik/quik_proximity_marketing/commit/830549c0d3c7b701737ed49be1a2ea6abfa23c2e))
- add Dub tracking support to registration page with conditional client-side rendering ([4b7f744](https://github.com/QQuik/quik_proximity_marketing/commit/4b7f7440dd47638093658de63bd831fe1771a3c0))
- configure Dub analytics to track outbound links for li2.ai domains ([9f6f359](https://github.com/QQuik/quik_proximity_marketing/commit/9f6f35934acfa8f1c25827fb24411240d9e0e750))
- move DubProvider to html element for earlier tracking initialization ([8dbaebb](https://github.com/QQuik/quik_proximity_marketing/commit/8dbaebb4421fc4e0d7cbc85be36849a5e8fd5832))

### 🧹 Chore

- **release:** 1.7.0 [skip ci] ([96b6ba5](https://github.com/QQuik/quik_proximity_marketing/commit/96b6ba554178f21b5105e7a2cd65399677401108))

## [1.7.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.6.0...v1.7.0) (2026-01-05)

### ✨ Features

- add Dub tracking integration for sign-up events and click attribution ([830549c](https://github.com/QQuik/quik_proximity_marketing/commit/830549c0d3c7b701737ed49be1a2ea6abfa23c2e))
- add Dub tracking support to registration page with conditional client-side rendering ([4b7f744](https://github.com/QQuik/quik_proximity_marketing/commit/4b7f7440dd47638093658de63bd831fe1771a3c0))
- configure Dub analytics to track outbound links for li2.ai domains ([9f6f359](https://github.com/QQuik/quik_proximity_marketing/commit/9f6f35934acfa8f1c25827fb24411240d9e0e750))

## [1.6.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.5.1...v1.6.0) (2025-12-16)

### ✨ Features

- add audit logging for touch-point deletions and improve QR code rendering ([39ddc84](https://github.com/QQuik/quik_proximity_marketing/commit/39ddc84227a3320895b30a631fef347fd76191f5))
- enhance env encryption script with interactive environment selection and multi-file support ([f8894d6](https://github.com/QQuik/quik_proximity_marketing/commit/f8894d6c38ed556c794ff76cfd7745b4fe7e7cd8))
- improve QR code download handling and add 403 error redirect ([888dc6e](https://github.com/QQuik/quik_proximity_marketing/commit/888dc6e5366d5b23826976b1060fdad8a351fade))
- restructure touch point API response to include canEdit flag in data object ([82ad1a2](https://github.com/QQuik/quik_proximity_marketing/commit/82ad1a2a44b248debb92fe290868691ca44a6588))
- simplify English bulk import notification messages ([b1b441f](https://github.com/QQuik/quik_proximity_marketing/commit/b1b441f2ac3974c06e759595df2ddbd014feceaa))
- simplify Vietnamese bulk import notification messages ([84e73b7](https://github.com/QQuik/quik_proximity_marketing/commit/84e73b71ac5f43412aeec9da6ad7f6a903e4391d))

### 🐛 Bug Fixes

- 🥹 ([a172f50](https://github.com/QQuik/quik_proximity_marketing/commit/a172f50b4917274a2b1cf0eab602f4e65e469bba))

## [1.5.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.5.0...v1.5.1) (2025-12-15)

### 🐛 Bug Fixes

- 🥹 ([#587](https://github.com/QQuik/quik_proximity_marketing/issues/587)) ([6d1851a](https://github.com/QQuik/quik_proximity_marketing/commit/6d1851a8575e6f4d7fe60c9bd58b43db743ff3ee))

## [1.5.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.4.0...v1.5.0) (2025-12-15)

### ✨ Features

- add translation for insufficient permissions to add touchpoints and update manager role permissions ([eb7ab22](https://github.com/QQuik/quik_proximity_marketing/commit/eb7ab223cbda39c05e8b3f1434f2fc5ec70aeda8))

## [1.4.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.3.0...v1.4.0) (2025-12-15)

### ⚠ BREAKING CHANGES

- re-enable campaign builder (#558)

### ✨ Features

- Add "Collection Content Editing" and "Bulk Operations" sections to RBAC documentation; include detailed permission checks, flowcharts, and code examples for enhanced clarity and usability ([acc7679](https://github.com/QQuik/quik_proximity_marketing/commit/acc7679f01e41be331e4b4a23058c361c1c4e1ea))
- add A/B testing configuration for traffic splitting ([#549](https://github.com/QQuik/quik_proximity_marketing/issues/549)) ([f3f47ab](https://github.com/QQuik/quik_proximity_marketing/commit/f3f47ab13fde58f7b949aa590f36190bf010aca4))
- add comprehensive i18n translations and improve UI consistency ([1d3271c](https://github.com/QQuik/quik_proximity_marketing/commit/1d3271c774dacfd6654247858a4da21281587c53))
- add creator column to tags table and improve tag management UI ([da785d3](https://github.com/QQuik/quik_proximity_marketing/commit/da785d36120f866edd18a9f2d3f966dc609e4a19))
- add CSV import/export with E2EE premium features ([bce68f7](https://github.com/QQuik/quik_proximity_marketing/commit/bce68f7271578ccae583d7cd2f5f4a99e86f153f))
- add date range and bot filtering to UTM campaign and channel analytics ([8451f92](https://github.com/QQuik/quik_proximity_marketing/commit/8451f92b80c87aec2fa65fbf5dad86f51ddb9d64))
- add feature e2e encryption ([#551](https://github.com/QQuik/quik_proximity_marketing/issues/551)) ([4b09792](https://github.com/QQuik/quik_proximity_marketing/commit/4b09792accab22c9e356dfd4ffec25fe252e3fef))
- add feature utm campaign ([#573](https://github.com/QQuik/quik_proximity_marketing/issues/573)) ([b00733a](https://github.com/QQuik/quik_proximity_marketing/commit/b00733a17aace2d889fe440d81beadc3132dc902))
- add filter by Spaces ([b2e9740](https://github.com/QQuik/quik_proximity_marketing/commit/b2e974072381f7be257292f990dfefc138fad2ea))
- add import/export action component and improve integration form UI ([c5eefdc](https://github.com/QQuik/quik_proximity_marketing/commit/c5eefdc867c956968a6a3823794fd624b5c1cb4e))
- add in app notification ([#572](https://github.com/QQuik/quik_proximity_marketing/issues/572)) ([dc2aaab](https://github.com/QQuik/quik_proximity_marketing/commit/dc2aaab815d9a26e80cf84e2b8a2e7becd7a802d))
- add ingeration googlesheets ([#568](https://github.com/QQuik/quik_proximity_marketing/issues/568)) ([54c7957](https://github.com/QQuik/quik_proximity_marketing/commit/54c7957b339a7371f5010a0ed5de5cfb68cb6c14))
- add permission check for anonymous migration ([c41a603](https://github.com/QQuik/quik_proximity_marketing/commit/c41a6039770399e062d6ff7e547c666a73a92b2a))
- add role-based permission scoping for UTM template operations ([1e5fb94](https://github.com/QQuik/quik_proximity_marketing/commit/1e5fb94ab2d16cffee9eadb06b20c968692a4819))
- add UTM campaign analytics with touchpoint filtering and improved UI ([#575](https://github.com/QQuik/quik_proximity_marketing/issues/575)) ([b38a368](https://github.com/QQuik/quik_proximity_marketing/commit/b38a368ac3f230a376818863ecf173235ccb01cd))
- **analytics:** add applied filters display and unified filter popover components ([8a5273d](https://github.com/QQuik/quik_proximity_marketing/commit/8a5273da40300edbe432ed5ad630e3899e5f6815))
- auto-fill touch point name from meta title in simple form ([d2ae3a0](https://github.com/QQuik/quik_proximity_marketing/commit/d2ae3a048434ef6a400528aba9dac46d1b75d330))
- be foundation for filter by utm ([c23ff97](https://github.com/QQuik/quik_proximity_marketing/commit/c23ff97717e67befaf0ddf1da31c5d5ea4534c84))
- enable ChatWoot integration for production environment ([03989f3](https://github.com/QQuik/quik_proximity_marketing/commit/03989f3d775209e7f108c97be983f349f0d01304))
- enhance collection permissions to allow collaborative editing of touch-points ([99233da](https://github.com/QQuik/quik_proximity_marketing/commit/99233dad318e3ac9fd6bac18cbe8ca602fe97a9f))
- enhance touchpoint selection UI with improved table layout and filtering ([a37d4da](https://github.com/QQuik/quik_proximity_marketing/commit/a37d4da09659fbb26b4fb515b911b1dee10ec2d2))
- enhance usage quota UI with AI credits and collections support ([0a4e2ab](https://github.com/QQuik/quik_proximity_marketing/commit/0a4e2abd0312aba4d8663e4a7b24b008c57956bc))
- enhance usage quota UI with new UTM templates and improved styling ([2da14ec](https://github.com/QQuik/quik_proximity_marketing/commit/2da14ec17060ff4e0fc8ed9c7e51092ffee692c8))
- enhance UTM campaign analytics with channel filtering, improved charts, and UI refinements ([5621eef](https://github.com/QQuik/quik_proximity_marketing/commit/5621eefdb07f1d8c0c33c4d8da3e2c780cebc8b5))
- enhance UTM campaigns UI with pagination and improved layout ([58b0fa1](https://github.com/QQuik/quik_proximity_marketing/commit/58b0fa199e6b5b791aee25d9a96ee315b903dab3))
- FE for filter by utm ([de95af3](https://github.com/QQuik/quik_proximity_marketing/commit/de95af3504d8dae8ba3ad1f277b6da0e83794d56))
- feature link cloaking ([#548](https://github.com/QQuik/quik_proximity_marketing/issues/548)) ([39b2f82](https://github.com/QQuik/quik_proximity_marketing/commit/39b2f8286961af486f619b78541dea26b790daba))
- implement Protocol Buffers encoding for Asynq task enqueueing ([e4ee5f9](https://github.com/QQuik/quik_proximity_marketing/commit/e4ee5f95c25d662111a5bca3dab02cf3d6a0e0b1))
- improve file upload validation and internationalization ([e49df88](https://github.com/QQuik/quik_proximity_marketing/commit/e49df888f50b05ec244ae1b173cf7ad6b285ba03))
- improve import export feature & make tag_name-org_id unique ([#553](https://github.com/QQuik/quik_proximity_marketing/issues/553)) ([db0d450](https://github.com/QQuik/quik_proximity_marketing/commit/db0d4500bcbade077fecef41e03a5f93cff2046d))
- improve layout and styling of touch point creation page ([50853dd](https://github.com/QQuik/quik_proximity_marketing/commit/50853dda4acddf0bd23773b790c2904c322b92ca))
- improve navbar title visibility with darker text color ([a35f934](https://github.com/QQuik/quik_proximity_marketing/commit/a35f934bbae99b31d0b50202e2f78f37832ee110))
- improve semantic release configuration for dev branch ([18f5cfa](https://github.com/QQuik/quik_proximity_marketing/commit/18f5cfa25d42fbba5f7987f24561b9b00dd95e35))
- Introduce v2 UTM campaign forms with bulk link management, channel selection, and a dedicated creation page. ([5ee0b97](https://github.com/QQuik/quik_proximity_marketing/commit/5ee0b97bcc8f0bf40dd030ae00f65e37b901e226))
- migrate to AES-128-GCM encryption for touch points ([41a8614](https://github.com/QQuik/quik_proximity_marketing/commit/41a8614ac6e5107ab1558dff2147748b6a4576ee))
- pass qrOnly prop through ImportExportAction component chain ([feb1b91](https://github.com/QQuik/quik_proximity_marketing/commit/feb1b91ee9c52156192cc440169c17dc82f5283d))
- re-enable campaign builder ([#558](https://github.com/QQuik/quik_proximity_marketing/issues/558)) ([eff1405](https://github.com/QQuik/quik_proximity_marketing/commit/eff140507434f2be1c89fe6459cdc38698b20b0b))
- refactor and re-enable feature org member ([#545](https://github.com/QQuik/quik_proximity_marketing/issues/545)) ([2fa1e77](https://github.com/QQuik/quik_proximity_marketing/commit/2fa1e777645b9f596c7ac3421af0578f3d7fc07e))
- restrict campaigns, integrations, and sheets import/export to development environment ([3b5ebc7](https://github.com/QQuik/quik_proximity_marketing/commit/3b5ebc7f188c4e01bb0bad7cd3932f87b6a1e0c9))
- update custom domain management UI and translations ([13d161d](https://github.com/QQuik/quik_proximity_marketing/commit/13d161d8af00ed5a49ebc3d3bdad7d700a3e2b72))
- update more item sharing ([f9f809c](https://github.com/QQuik/quik_proximity_marketing/commit/f9f809ce6ebea05a160ad8023b2fa8631039c920))
- update sharing ([fdbebeb](https://github.com/QQuik/quik_proximity_marketing/commit/fdbebebeadfbc73244ec4ee79f3597d31d3b036c))
- update UI styling and add new translations ([#546](https://github.com/QQuik/quik_proximity_marketing/issues/546)) ([a256ced](https://github.com/QQuik/quik_proximity_marketing/commit/a256cedc9629e68e28614e4c2e2a061bcb1109f3))
- update user navigation styling with new color scheme ([7fca2c0](https://github.com/QQuik/quik_proximity_marketing/commit/7fca2c016c48ebeaa94c8917c57f57e279b91c3c))
- use NEXT_PUBLIC_APP_BASE_URL for Google Sheets OAuth redirect URI ([36aada1](https://github.com/QQuik/quik_proximity_marketing/commit/36aada12c618d00c0753e6f4d8abe7fe795bf04a))

### 🐛 Bug Fixes

- add organization_id to campaign channel uniqueness constraint ([eafa1ed](https://github.com/QQuik/quik_proximity_marketing/commit/eafa1ed91285517dc0aa0f3e14d4ea5d5680bf69))
- correct filter for single tp page ([2344ad4](https://github.com/QQuik/quik_proximity_marketing/commit/2344ad4cbbc5b2a676b79cb0d2194db03991a4b1))
- disable messeger ([ac7bee2](https://github.com/QQuik/quik_proximity_marketing/commit/ac7bee2c17ac62fdf4eec22172634b8547fdb503))
- enhance permission filtering for tags and touch_points based on user roles ([e11c55e](https://github.com/QQuik/quik_proximity_marketing/commit/e11c55e5b0d94c179e78b71cf89ae543f004f42c))
- enhance permission handling for touch points list with upfront collection filtering ([6a94c24](https://github.com/QQuik/quik_proximity_marketing/commit/6a94c24f79b437883ec23a8a7a3ae062eaee613d))
- enhance touch-point movement logic with improved permission checks and atomic operations ([974b617](https://github.com/QQuik/quik_proximity_marketing/commit/974b617c440ef5d10ef24ca66b36852ad7917c5d))
- ensure default values for form section visibility in TouchPointAdvancedForm ([257a330](https://github.com/QQuik/quik_proximity_marketing/commit/257a3306370cbb0025aa237323bc5038445283bd))
- error in touch point detail page ([c4c8b69](https://github.com/QQuik/quik_proximity_marketing/commit/c4c8b693b512c53e814a575334801e80b57ed3b0))
- error that channel analytic got full data of campaign analytic ([5e01142](https://github.com/QQuik/quik_proximity_marketing/commit/5e01142a2a075575bfda06aa7d8086381d70fe57))
- error that make api response successed when user dont have permission to delete touch point ([7ea4a92](https://github.com/QQuik/quik_proximity_marketing/commit/7ea4a929b5b552caf5b136e96d38c1c7baceb664))
- fetch meta tags when data is null or matches default values ([47d9a38](https://github.com/QQuik/quik_proximity_marketing/commit/47d9a380a5ac38f459fa5671a61baef8143a6826))
- fix error that make app crash when create link with invalid destination's metatags ([dc6321c](https://github.com/QQuik/quik_proximity_marketing/commit/dc6321c6b0fe0d5abcc581ff3c778c4bf2e664e8))
- fix typescript error ([6758f6d](https://github.com/QQuik/quik_proximity_marketing/commit/6758f6d83819df4465d66cfee0ac4ddd8bafe970))
- fix update state selected ([57e1b77](https://github.com/QQuik/quik_proximity_marketing/commit/57e1b77796144d02864efbbc5269201686cbfcf5))
- handle non-Date objects in access control timestamps and return null for negative limit values ([773896c](https://github.com/QQuik/quik_proximity_marketing/commit/773896cdafdc8fc8e58a66124da9c45c2fdaed4d))
- handle null meta tag images and improve touch point form auto-fill behavior ([b9ee254](https://github.com/QQuik/quik_proximity_marketing/commit/b9ee254a0d7716b3a04916ba8b4ae95625f2e4ff))
- handle potential null values in member updates and removals ([#562](https://github.com/QQuik/quik_proximity_marketing/issues/562)) ([00ffa37](https://github.com/QQuik/quik_proximity_marketing/commit/00ffa37a2cb0e10f81f494a41a07c528b4236157))
- improve bar chart styling and query cache handling in UTM campaigns ([49a13b6](https://github.com/QQuik/quik_proximity_marketing/commit/49a13b60e0152d4417c75cf9827aa8243a1a7043))
- improve collaborative editing support for touch points and refine permission checks ([531a01c](https://github.com/QQuik/quik_proximity_marketing/commit/531a01c9e1f5314e251fad1023e5482f72ae7646))
- improve tag retrieval logic by refining touch-point ID queries based on collection access ([0df37b6](https://github.com/QQuik/quik_proximity_marketing/commit/0df37b6fb07796076d0fa5e0cf2343d82193f257))
- improve UTM campaign creation flow and touchpoint permission handling ([c1bcccb](https://github.com/QQuik/quik_proximity_marketing/commit/c1bcccb32a359b1828745827cd72904aacf76c92))
- make privacy security fields optional in schema ([9106583](https://github.com/QQuik/quik_proximity_marketing/commit/91065835a02472ebdec4d170761b22226ad57ab2))
- org viewer dashboard ([edc9a43](https://github.com/QQuik/quik_proximity_marketing/commit/edc9a43d0e75242ef26e4b8067fcbcd13b31845e))
- refine permission checks for collection access and uncategorized touch-points in Dashboard ([67a62bd](https://github.com/QQuik/quik_proximity_marketing/commit/67a62bdca03ba42ea7f867bf99123eafa4bfe15e))
- remove error re-throw and adjust name validation ([612e307](https://github.com/QQuik/quik_proximity_marketing/commit/612e30723e96e465a67b5f731109357a06d89223))
- reset selection state ([fa878bd](https://github.com/QQuik/quik_proximity_marketing/commit/fa878bd6a8eabd755c907b1cb6450db5cab4e501))
- update member role handling and permissions logic ([1e848e0](https://github.com/QQuik/quik_proximity_marketing/commit/1e848e0e37b9dba796db70a724e5ac3aec2a8c3d))
- update/create in campaign feature ([#574](https://github.com/QQuik/quik_proximity_marketing/issues/574)) ([5ee8d74](https://github.com/QQuik/quik_proximity_marketing/commit/5ee8d74924dbd9b241d2504d59f133fabb632305))

### 🛠 Updates

- change editor to member ([2ecaf5a](https://github.com/QQuik/quik_proximity_marketing/commit/2ecaf5ae6eb5b53daa5930843954c86c31b4ead8))
- change from direct supabase call to use service ([c8fc66a](https://github.com/QQuik/quik_proximity_marketing/commit/c8fc66ad830f32bdcf75c16357c13a3701c69c98))
- enable and refactor llm service ([#547](https://github.com/QQuik/quik_proximity_marketing/issues/547)) ([060ce5f](https://github.com/QQuik/quik_proximity_marketing/commit/060ce5fb414c11f09c83c0d83fb47d44cad7aeaa))
- modify campaign analytic ui that merge pie & bar chart of analytic by channels into 1 section ([dec37b7](https://github.com/QQuik/quik_proximity_marketing/commit/dec37b71090f67326ac422e3e12e2c19a45987da))

### ♻️ Code Refactoring

- add error handling to auto-mapping logic ([95e6e51](https://github.com/QQuik/quik_proximity_marketing/commit/95e6e517b74735fd6469a21ec65d744c54549246))
- improve form handling and add theme switcher in development mode ([c4114b9](https://github.com/QQuik/quik_proximity_marketing/commit/c4114b962586464a5c26e00db2278f7c1d38ab06))
- improve table styling and fix QR enabled column import configuration ([ff6e535](https://github.com/QQuik/quik_proximity_marketing/commit/ff6e535a1cec1d8e436879d12bed3603b88765e4))
- improve type safety in privacy security validation ([d846257](https://github.com/QQuik/quik_proximity_marketing/commit/d846257d18885c0bc77843273c24b08e33084de4))
- improve UTM campaign channel handling and fix Google Sheets token refresh ([2a16fc4](https://github.com/QQuik/quik_proximity_marketing/commit/2a16fc4812804453069498a194d7d488b55d8e76))
- improve UTM template management and touch point handling ([423baf8](https://github.com/QQuik/quik_proximity_marketing/commit/423baf8c2808631b2082c1fd930e9794df1fce38))
- migrate tag routes to use service layer ([#570](https://github.com/QQuik/quik_proximity_marketing/issues/570)) ([67968e4](https://github.com/QQuik/quik_proximity_marketing/commit/67968e43660894a74958104c6066ef68449f1a8f))
- remove short_code fallback from touch point export ([8eb11c0](https://github.com/QQuik/quik_proximity_marketing/commit/8eb11c0d9e53f2ff6bf6016abd87bec51878ab33))
- remove touch point URL update on domain deletion and show default domain in preview ([255ae0d](https://github.com/QQuik/quik_proximity_marketing/commit/255ae0dd82fc0b0ed2b22b8c3ca065ea024ea7a8))
- remove unused AAD parameter from crypto functions ([ac181de](https://github.com/QQuik/quik_proximity_marketing/commit/ac181decc1c96b9391a3725f0ce8516f12c600e6))
- reorder export columns and update Vietnamese translations ([fe640b7](https://github.com/QQuik/quik_proximity_marketing/commit/fe640b7600526d465450d2958effdd20b3e6d079))
- reorganize layout structure and update import paths for ContentLayout component ([5af7834](https://github.com/QQuik/quik_proximity_marketing/commit/5af7834545fdfe606bf0407bb17bc27092f4b610))
- reorganize touch point schema and targeting files ([26c4b1d](https://github.com/QQuik/quik_proximity_marketing/commit/26c4b1dfaf57931c3178820a036349237bda69e1))
- replace firecrawler with MetaScraper for fetching meta tags ([ab14821](https://github.com/QQuik/quik_proximity_marketing/commit/ab148219621baba5b783269b37f9f71ac2d78990))
- replace hardcoded white backgrounds with theme-aware background color ([c79f45d](https://github.com/QQuik/quik_proximity_marketing/commit/c79f45d4a9ac477740e8702724ddb00fec9f9167))
- simplify auto-mapping callback structure ([fb962ea](https://github.com/QQuik/quik_proximity_marketing/commit/fb962eabc645c588abcaa1d96da0a63bdeeb907e))
- simplify docker network configuration ([2e6ad96](https://github.com/QQuik/quik_proximity_marketing/commit/2e6ad96fb24c64b134b91839510fdf84fec60c0f))
- simplify touch point variants schema by removing URL validation ([1e5a150](https://github.com/QQuik/quik_proximity_marketing/commit/1e5a150b382c6e28095d94c4edc16a8bec76d4a8))
- update permission handling for touch points and tags, improve access control logic ([0d7622c](https://github.com/QQuik/quik_proximity_marketing/commit/0d7622c509b78a3db6bb3ecfba99cb58f4789ef0))
- use strictBoolean for link cloaking schema validation ([9f805b0](https://github.com/QQuik/quik_proximity_marketing/commit/9f805b0e9ca21184619606f70a97806bfb2f72e0))

### 🧹 Chore

- bump version from 1.1.0-development.24 to 1.3.0 ([a0ad3ab](https://github.com/QQuik/quik_proximity_marketing/commit/a0ad3ab9e4e6f11b6eff672b22c9906a83dc5210))
- change text label ([2b0ad57](https://github.com/QQuik/quik_proximity_marketing/commit/2b0ad5785eabbe7ec5f33b7f6ed508d319d5b7b9))
- comment out entire touch point form component ([5874b7f](https://github.com/QQuik/quik_proximity_marketing/commit/5874b7fbfc307f7f515155b625e136a01adcca77))
- delete file ([613b3a2](https://github.com/QQuik/quik_proximity_marketing/commit/613b3a2c89237e17d0413930689b4b2c8cb3ca22))
- disable ai gen button ([fc53f79](https://github.com/QQuik/quik_proximity_marketing/commit/fc53f79114ea4569ccaeda5c1b2e541ac9af9456))
- disable openobserve ([0257f21](https://github.com/QQuik/quik_proximity_marketing/commit/0257f2166312ae5aa7f228362da6a8246a652286))
- enable external devnet network configuration in dev docker-compose ([9dbd2f2](https://github.com/QQuik/quik_proximity_marketing/commit/9dbd2f204421cccb3d732070d5a2a610c0a92a1e))
- enhance audit logging for invitations, members, tags, and touch-points with improved delete operations ([be6a135](https://github.com/QQuik/quik_proximity_marketing/commit/be6a135308431056228716df32fd860799c25277))
- enhance Docker build and push configuration in dev deployment workflow ([29c1f4d](https://github.com/QQuik/quik_proximity_marketing/commit/29c1f4d1964cdbdc8d0d2888a5097ddca505549e))
- **release:** 1.1.0-development.23 [skip ci] ([13cc3eb](https://github.com/QQuik/quik_proximity_marketing/commit/13cc3ebdefebb497bb9094aa4e8591e646a59942))
- **release:** 1.1.0-development.24 [skip ci] ([2b029c4](https://github.com/QQuik/quik_proximity_marketing/commit/2b029c41c7c281d69e485e2c73f2c46004b780a8))
- simplify back half history description and remove debug log ([4712f01](https://github.com/QQuik/quik_proximity_marketing/commit/4712f0164199da950129a7b7dbca275fceff11a9))
- update AI provider configuration and audit log modules ([708459d](https://github.com/QQuik/quik_proximity_marketing/commit/708459d90229d9c57e9e11ebf57621b627a54b2c))
- update docs ([372eff1](https://github.com/QQuik/quik_proximity_marketing/commit/372eff1dd80c807a582fb5d83dad739b3bc99cfd))
- update encrypted development environment configuration ([84ef82d](https://github.com/QQuik/quik_proximity_marketing/commit/84ef82dce1a967722b22d55138b5e98d864068f9))
- update encrypted development environment configuration ([22bc66c](https://github.com/QQuik/quik_proximity_marketing/commit/22bc66c3faf2bf81997d18a78582855200bd4929))
- update encrypted development environment variables ([56ed32b](https://github.com/QQuik/quik_proximity_marketing/commit/56ed32bdb757c6d40999bcc6c4b37a2670db574e))
- update encrypted production environment configuration ([b820229](https://github.com/QQuik/quik_proximity_marketing/commit/b820229dc85c6da5d76114f6175d56ef7c3957d2))
- update migration success message and disable ChatWoot integration ([b52c584](https://github.com/QQuik/quik_proximity_marketing/commit/b52c5849f079af67c38e1dc568832086fbb9f266))
- update organization access labels and permissions in i18n files ([1cc4102](https://github.com/QQuik/quik_proximity_marketing/commit/1cc4102aff6e5b87ee2c8b7608252ab1ae505119))
- update SSH username from root to ftc in dev deployment workflow ([8f6d060](https://github.com/QQuik/quik_proximity_marketing/commit/8f6d06019d82a8004c1729698359a86ea0c0b112))

### 📚 Documentation

- add comprehensive JSDoc documentation to service classes ([6d9332b](https://github.com/QQuik/quik_proximity_marketing/commit/6d9332ba2ff1ca971097a7c11b179cf224918ee3))
- update migration guide with tag deduplication and import process ([3af2629](https://github.com/QQuik/quik_proximity_marketing/commit/3af26299c45942085f247fcfdbebb3b17b7fb443))

### 🎨 Code Style

- update input styling with consistent text colors and border behavior ([6b8f6d3](https://github.com/QQuik/quik_proximity_marketing/commit/6b8f6d3eae610b578a916976b8f613a3d178862a))
- update/UI modify ([#557](https://github.com/QQuik/quik_proximity_marketing/issues/557)) ([e00c218](https://github.com/QQuik/quik_proximity_marketing/commit/e00c2187d70bae819f4638a35d06fef90c97daf1))

## [1.3.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.2.0...v1.3.0) (2025-10-31)

### ✨ Features

- enable ChatWoot integration for production environment ([863e023](https://github.com/QQuik/quik_proximity_marketing/commit/863e02330bfd88873a2a692f61a32f5cb595e5f3))

### 🛠 Updates

- change from direct supabase call to use service ([b36b3f8](https://github.com/QQuik/quik_proximity_marketing/commit/b36b3f8e2c5b52238d3272e571ab37ba5ca58b5d))

## [1.2.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.2...v1.2.0) (2025-10-28)

### ✨ Features

- add role-based permission scoping for UTM template operations ([89f600c](https://github.com/QQuik/quik_proximity_marketing/commit/89f600c8fcc6363ccaa964fa22fb2b97ea6b20f8))

### ♻️ Code Refactoring

- remove touch point URL update on domain deletion and show default domain in preview ([b7c8fd2](https://github.com/QQuik/quik_proximity_marketing/commit/b7c8fd2b1a0fa30a5522b1fd25f7e235ef85e82d))
- replace firecrawler with MetaScraper for fetching meta tags ([7a1c40f](https://github.com/QQuik/quik_proximity_marketing/commit/7a1c40fc191352069e1a081ed08753cd8b84006d))

### 🧹 Chore

- simplify back half history description and remove debug log ([0f3e0f4](https://github.com/QQuik/quik_proximity_marketing/commit/0f3e0f4150584e2653a18f6021b7ff80c12a3097))

### 🎨 Code Style

- update input styling with consistent text colors and border behavior ([fe3d825](https://github.com/QQuik/quik_proximity_marketing/commit/fe3d82554b98af542b15b4446ef6b30bf8c74e1f))

## [1.1.2](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.1...v1.1.2) (2025-10-28)

### 🐛 Bug Fixes

- fetch meta tags when data is null or matches default values ([4f8614e](https://github.com/QQuik/quik_proximity_marketing/commit/4f8614e2765836f83d0ad24541a31560be5ef122))

### ♻️ Code Refactoring

- simplify touch point variants schema by removing URL validation ([261e8e8](https://github.com/QQuik/quik_proximity_marketing/commit/261e8e8305ac5377cb2c3a2404a2146cbee10e92))

### 🧹 Chore

- comment out entire touch point form component ([a22b63f](https://github.com/QQuik/quik_proximity_marketing/commit/a22b63faa201744c1277762030d87bbbe3f82163))

## [1.1.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0...v1.1.1) (2025-10-28)

### 🐛 Bug Fixes

- handle non-Date objects in access control timestamps and return null for negative limit values ([fdf70ed](https://github.com/QQuik/quik_proximity_marketing/commit/fdf70ed2ffb91e8c763d54c5ea0908d7ce940d78))

### 🧹 Chore

- disable ai gen button ([f818b3e](https://github.com/QQuik/quik_proximity_marketing/commit/f818b3eb4ac3e7d3979119f8543a3df79490af5c))
- disable openobserve ([5bfdc37](https://github.com/QQuik/quik_proximity_marketing/commit/5bfdc37eb4b5c9e73ae2ffc0a63ba8f0a8774332))
- update migration success message and disable ChatWoot integration ([d47d203](https://github.com/QQuik/quik_proximity_marketing/commit/d47d2035cf5a6e7b8fcaf036bd49a0078d6ffce0))

## [1.1.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.3...v1.1.0) (2025-10-28)

### ✨ Features

- add @tanstack/react-virtual for improved virtual scrolling in RealtimeGlobe component ([da23e1a](https://github.com/QQuik/quik_proximity_marketing/commit/da23e1af00ed2856b42875e4d5ab18da5f15e5b6))
- add delete actions for dynamic targeting rules and update translations ([ba1c61a](https://github.com/QQuik/quik_proximity_marketing/commit/ba1c61af246847f8e7bf244b148d8442ea773bb1))
- add destination analytics with audit logging for touchpoints ([#527](https://github.com/QQuik/quik_proximity_marketing/issues/527)) ([9443081](https://github.com/QQuik/quik_proximity_marketing/commit/94430810411b5e0233393ecc5c3e5b20dcab3f50))
- add Detail Engagement data to basic analytics ([#525](https://github.com/QQuik/quik_proximity_marketing/issues/525)) ([bbe19c7](https://github.com/QQuik/quik_proximity_marketing/commit/bbe19c774a63aee8ac9f0edc163c6374742ab011))
- add device os targeting form ([0e0d281](https://github.com/QQuik/quik_proximity_marketing/commit/0e0d28103f74871a8bd83ca5441596912b73536d))
- add device targeting route handle ([99581c7](https://github.com/QQuik/quik_proximity_marketing/commit/99581c7dd998002fd92da744afd2f837024e121e))
- add domain_id field to touch points when creating or bootstrapping ([4f88646](https://github.com/QQuik/quik_proximity_marketing/commit/4f88646962d4307a5ff90395e0361b37c5bea008))
- add geo targeting service & repository & form ([19a9ea3](https://github.com/QQuik/quik_proximity_marketing/commit/19a9ea3b848ea7bf014da8dd2d9d9625c56445af))
- add geocoding utility functions for country coordinates ([e4c7ee7](https://github.com/QQuik/quik_proximity_marketing/commit/e4c7ee79af045ce49a2c8f781d2e369746c9bf1a))
- add i18n support and form translations for touchpoint module ([92c8dbf](https://github.com/QQuik/quik_proximity_marketing/commit/92c8dbf88c358e9be8b4839d738ba97b10d916a7))
- add interaction targeting type ([#496](https://github.com/QQuik/quik_proximity_marketing/issues/496)) ([2faba43](https://github.com/QQuik/quik_proximity_marketing/commit/2faba4327bb524d8d8b2905f532f921e55ca9d32))
- add link access control and expiration settings ([#534](https://github.com/QQuik/quik_proximity_marketing/issues/534)) ([a4bf991](https://github.com/QQuik/quik_proximity_marketing/commit/a4bf991c170fd57428a16b0c7e05fedffe75a127))
- add localize ([c7db9dc](https://github.com/QQuik/quik_proximity_marketing/commit/c7db9dce2e7fabe42fb70c29202d4d1f1e546b3b))
- add set default domain action and repository methods ([#523](https://github.com/QQuik/quik_proximity_marketing/issues/523)) ([1b7f8d6](https://github.com/QQuik/quik_proximity_marketing/commit/1b7f8d6879bd72b44a55f0fb0c2ac0295b085532))
- add tracking and UTM builder options to advanced settings menu ([370fc2f](https://github.com/QQuik/quik_proximity_marketing/commit/370fc2f91ab3f45865e059e620edb80f083d1db0))
- add utm template ([be4d3e5](https://github.com/QQuik/quik_proximity_marketing/commit/be4d3e53a54355c2736a7e0332adc617299b757a))
- add utm template ([e0c6d27](https://github.com/QQuik/quik_proximity_marketing/commit/e0c6d27acd055d05feddf6a64c9b8361aef548d5))
- enhance realtime data UI with auto-update feature and improved translations ([bfa2a8c](https://github.com/QQuik/quik_proximity_marketing/commit/bfa2a8c3268ae5789393b35effc758deb9783357))
- enhance touch point menu with advanced options and localization updates ([d493c3b](https://github.com/QQuik/quik_proximity_marketing/commit/d493c3b661b7dc9ce48f9868cc0309f39a0703cb))
- enrich touch point data with visit counts and update localization files ([1f5ee70](https://github.com/QQuik/quik_proximity_marketing/commit/1f5ee70acedc458ff230ae769ce09f3385d63753))
- implement debounced mutation with cancel token for dynamic targeting form ([8c20550](https://github.com/QQuik/quik_proximity_marketing/commit/8c205504bcd3038feaf7cfab1f59e68960a441e6))
- new ui ([#526](https://github.com/QQuik/quik_proximity_marketing/issues/526)) ([fe997ee](https://github.com/QQuik/quik_proximity_marketing/commit/fe997ee78ca27a4ca818fa0f9afbcd16d487675c))
- update analytic ui & table destination analytic ([#532](https://github.com/QQuik/quik_proximity_marketing/issues/532)) ([86fad00](https://github.com/QQuik/quik_proximity_marketing/commit/86fad00150bc14b58a44a1dd219f7f97fac0685a))
- use custom domain for touch point short URLs during migration ([50c5dfa](https://github.com/QQuik/quik_proximity_marketing/commit/50c5dfa9f54cf012734559ff99e3768a60c7ddb6))
- use default system domain for short URLs and fix dialog close handler ([f633f71](https://github.com/QQuik/quik_proximity_marketing/commit/f633f712bf8da02797ba0e69d16236ac9b4acff9))
- utm templates page ([3257d9c](https://github.com/QQuik/quik_proximity_marketing/commit/3257d9c9860a475bf567a56387a389b781f53bb7))
- utm templates page ([8031c04](https://github.com/QQuik/quik_proximity_marketing/commit/8031c0455f2d6f1e92efa3541a716fe2dbd5574f))

### 🐛 Bug Fixes

- add password field to touch point service and update UTM form UI ([302fc13](https://github.com/QQuik/quik_proximity_marketing/commit/302fc1384917c4d57a0f7a0ae42d7879e8c3b85a))
- add password field to touch point service and update UTM form UI ([ce124b3](https://github.com/QQuik/quik_proximity_marketing/commit/ce124b363d87751062e0c3a15f3feb09497279d1))
- adjust layout styles for better responsiveness in navbar and dialog components ([a81d721](https://github.com/QQuik/quik_proximity_marketing/commit/a81d7219a2b76b396d677445fd1846789cae72ea))
- correct css for link preview modal ([1705fff](https://github.com/QQuik/quik_proximity_marketing/commit/1705fff6a061dcc98cc91d84df27f256a9afbcbd))
- css layout for long list ([7c5e4fa](https://github.com/QQuik/quik_proximity_marketing/commit/7c5e4fa4bd793026454dfa385adfbe8bfc762a37))
- disable dropdown menu trigger for touch point slugs ([4d6ebcd](https://github.com/QQuik/quik_proximity_marketing/commit/4d6ebcdbbb189f9db6d5610af7ee50b26e14482e))
- exclude OrgAdvancedFeatureKey from PlanLimitKey type in plan evaluation functions ([fa942b3](https://github.com/QQuik/quik_proximity_marketing/commit/fa942b3fc63dca61f8d05ceb061f4d53c1197e41))
- icon size ([68c33c1](https://github.com/QQuik/quik_proximity_marketing/commit/68c33c197a16888094c6117e2f1b1e6f5dc83aa7))
- modal size not display well on smaller screen ([1154a98](https://github.com/QQuik/quik_proximity_marketing/commit/1154a98bdd886d27c7de071f7aa90894443c76c7))
- policy ([a806a2a](https://github.com/QQuik/quik_proximity_marketing/commit/a806a2a4313911073dff75791547ec143452a84c))
- policy ([e0424fe](https://github.com/QQuik/quik_proximity_marketing/commit/e0424fe52b10941bcd77ddec11aa864c4b8bb581))
- remove duplicate className prop in FancyMultiSelect component ([57e8986](https://github.com/QQuik/quik_proximity_marketing/commit/57e8986992838cd8ed703eaa595a4439bd1ff4e2))
- remove ip & fp limit for grant premium ([d78f51a](https://github.com/QQuik/quik_proximity_marketing/commit/d78f51a0bee9cc376cb583abddee827ca672bd57))
- remove slug from anon tp ([3cf2949](https://github.com/QQuik/quik_proximity_marketing/commit/3cf294964960fbd09b1810664641137ca060888d))
- remove unused targeting components and consolidate form logic ([b2494ed](https://github.com/QQuik/quik_proximity_marketing/commit/b2494ed80f14bf5dfd625a43b1e8845cfa07328e))
- tag color, chart color & tp tags refetch ([ef88b7e](https://github.com/QQuik/quik_proximity_marketing/commit/ef88b7e121defbd98e7ca2ea41f6a1af2886b4fb))
- touch point qr logo wrong render ([45e2434](https://github.com/QQuik/quik_proximity_marketing/commit/45e24344f3e8973cc4d5215693562167c666b941))
- try to fix error that slug appear when migrate anon tp ([c8e1c78](https://github.com/QQuik/quik_proximity_marketing/commit/c8e1c78dd3241ed0d68a386e812cbddd334f0641))
- ts error ([ec5a12f](https://github.com/QQuik/quik_proximity_marketing/commit/ec5a12f6b9d36e3fdb5e7427311982d944e815e8))
- ts error ([14b1ad1](https://github.com/QQuik/quik_proximity_marketing/commit/14b1ad1f93b09cbf0c27eeb2cd00042f94c42200))

### 🛠 Updates

- add coming soon state ([2adcfbd](https://github.com/QQuik/quik_proximity_marketing/commit/2adcfbd68b7a26796aa7c966032ea53479b5998d))
- adjust style for create new page ([#517](https://github.com/QQuik/quik_proximity_marketing/issues/517)) ([8cc6794](https://github.com/QQuik/quik_proximity_marketing/commit/8cc67945108af02e38bd5bdf04e9663d3d02b7df))
- analytics and destination history to support segment types & update plan ([7e68d6b](https://github.com/QQuik/quik_proximity_marketing/commit/7e68d6ba334f35d064e4c3502eb4404df4ca04d7))
- change more text ([20805c1](https://github.com/QQuik/quik_proximity_marketing/commit/20805c1ab04ff14802dfcac3ae0a3603b7060c81))
- change text and fix some display logic ([876884a](https://github.com/QQuik/quik_proximity_marketing/commit/876884a48147888c08d590c35368fc1aec38ead8))
- clean up code and change text ([4e86949](https://github.com/QQuik/quik_proximity_marketing/commit/4e86949179004fb10e7c18b9f56cee1caaa26049))
- enhance UTM and link preview settings, add tooltips, and improve UI components ([453e510](https://github.com/QQuik/quik_proximity_marketing/commit/453e510e8cf6f94055c8506ec264cfd5b19fceef))
- fix more text labels ([080b444](https://github.com/QQuik/quik_proximity_marketing/commit/080b4443593e72fee6ecb432fb5960a7da69b7b7))
- improve mobile responsiveness and UI interactions in dynamic targeting forms ([#511](https://github.com/QQuik/quik_proximity_marketing/issues/511)) ([5960bd5](https://github.com/QQuik/quik_proximity_marketing/commit/5960bd507a49c9d37b67b60e8bc2e8e1cd416fe9))
- metatags autofetch ([#531](https://github.com/QQuik/quik_proximity_marketing/issues/531)) ([1b68704](https://github.com/QQuik/quik_proximity_marketing/commit/1b6870469fc9d3b25c142c7475b522fef5432da4))
- migrate from localStorage to call API to get templates ([6142a29](https://github.com/QQuik/quik_proximity_marketing/commit/6142a29edbbe1b60ef23d74631141ddc06ef0cf8))
- migrate from localStorage to call API to get templates ([f4d055b](https://github.com/QQuik/quik_proximity_marketing/commit/f4d055bd615628e9ec49af3fbe3b80ea6babd2f4))
- more translation ([fcc1a3e](https://github.com/QQuik/quik_proximity_marketing/commit/fcc1a3e0bf8adbdb5a7e31cf2ee7b8c994940e6b))
- now form warning work on tp detail tabns ([7a18a62](https://github.com/QQuik/quik_proximity_marketing/commit/7a18a620f7b7b6e7174d2b6bebf909e905a13bff))
- qr code update by slug ([#513](https://github.com/QQuik/quik_proximity_marketing/issues/513)) ([8763a65](https://github.com/QQuik/quik_proximity_marketing/commit/8763a654f51541283ea878a87a768c2b5b5b54b4))
- re-enable lastloggedin ([#499](https://github.com/QQuik/quik_proximity_marketing/issues/499)) ([21262e4](https://github.com/QQuik/quik_proximity_marketing/commit/21262e4dd209c17dfea33827bd079163464d727c))
- sync preview link in detail page with create page, fix dialog size ([9333ae0](https://github.com/QQuik/quik_proximity_marketing/commit/9333ae08334d9d123a98278e1fbb121388fcd140))
- touchpoints detail page ([#498](https://github.com/QQuik/quik_proximity_marketing/issues/498)) ([6ebf65b](https://github.com/QQuik/quik_proximity_marketing/commit/6ebf65b1e2144d730a1c1354b6a1277dc2ee4bb2))
- update touch point list link & qr, update i18n ([#519](https://github.com/QQuik/quik_proximity_marketing/issues/519)) ([fc95d87](https://github.com/QQuik/quik_proximity_marketing/commit/fc95d8723fbfca18fe343ce1d9cc0b83711995fe))
- update tp targeting & fix build error ([#509](https://github.com/QQuik/quik_proximity_marketing/issues/509)) ([277de91](https://github.com/QQuik/quik_proximity_marketing/commit/277de917e3f5f85ce1216ea6b0bc6be202b11a38))

### ♻️ Code Refactoring

- remove domain validation and improve error logging in custom domains module ([07b332e](https://github.com/QQuik/quik_proximity_marketing/commit/07b332ed977caead58d04ab00f54223b60a86c04))
- remove domain validation and improve error logging in custom domains module ([eb8d186](https://github.com/QQuik/quik_proximity_marketing/commit/eb8d186e6b00867a8bf88720dd81962619d030b4))
- reorganize touch point creation with modular validation and parsing ([#540](https://github.com/QQuik/quik_proximity_marketing/issues/540)) ([74cbfd4](https://github.com/QQuik/quik_proximity_marketing/commit/74cbfd4954a3038e880c7c83e1a57434737b2f7d))
- replace hardcoded Redis connection with environment variables ([f8f82cb](https://github.com/QQuik/quik_proximity_marketing/commit/f8f82cbf816d7a746299d89f49a0fd22501a6441))
- update color system and simplify CSS theme variables ([d586174](https://github.com/QQuik/quik_proximity_marketing/commit/d5861740af9f5b14bb5d76049b22f99df7100103))

### 🧹 Chore

- add max height to realtime list ([#515](https://github.com/QQuik/quik_proximity_marketing/issues/515)) ([cf2322e](https://github.com/QQuik/quik_proximity_marketing/commit/cf2322ef6f8db5eabc177f90934cc312b019ed0c))
- add source map into next server ([38d4a58](https://github.com/QQuik/quik_proximity_marketing/commit/38d4a589debd1ba2ae02e61559ac9c995c5ee3ee))
- add source map into next server ([476aa3f](https://github.com/QQuik/quik_proximity_marketing/commit/476aa3f1939489179b5df9b4838eae65ebabb429))
- change text ([23f304b](https://github.com/QQuik/quik_proximity_marketing/commit/23f304beecb360919727184754b8aafcc1a2ab03))
- change touchpoint to links ([#512](https://github.com/QQuik/quik_proximity_marketing/issues/512)) ([ca9b8d2](https://github.com/QQuik/quik_proximity_marketing/commit/ca9b8d2a2ec1b91e145d6fd4cf92a55ddb9d3397))
- change touchpoints term to links ([#514](https://github.com/QQuik/quik_proximity_marketing/issues/514)) ([566e465](https://github.com/QQuik/quik_proximity_marketing/commit/566e4659a6e09c2951a5322932d46f438526229f))
- move files ([b1bd33d](https://github.com/QQuik/quik_proximity_marketing/commit/b1bd33de319a4e4cc88544c87bf7c7008fdf75e9))
- move files ([4fd4fec](https://github.com/QQuik/quik_proximity_marketing/commit/4fd4fecf79cd543f81eaa1e619c7fdd0aab637fb))
- **release:** 1.1.0-development.1 [skip ci] ([6e757a6](https://github.com/QQuik/quik_proximity_marketing/commit/6e757a613ff952b1d4ac2d6a4b1f083475f950dd))
- **release:** 1.1.0-development.10 [skip ci] ([36181fd](https://github.com/QQuik/quik_proximity_marketing/commit/36181fd26db7e7c7397acec059f10a3b75e767b3))
- **release:** 1.1.0-development.11 [skip ci] ([89e1263](https://github.com/QQuik/quik_proximity_marketing/commit/89e12636cc25b088049440bddfce6d960a187d0d))
- **release:** 1.1.0-development.12 [skip ci] ([24dc64b](https://github.com/QQuik/quik_proximity_marketing/commit/24dc64bae335ee465b2a97e9abb0fe09f4137655))
- **release:** 1.1.0-development.13 [skip ci] ([3fcc320](https://github.com/QQuik/quik_proximity_marketing/commit/3fcc320a3491020142ca4573939e6f15fd0a2540))
- **release:** 1.1.0-development.14 [skip ci] ([a4ac4c2](https://github.com/QQuik/quik_proximity_marketing/commit/a4ac4c297353da198aae488242f7f95a072c1775))
- **release:** 1.1.0-development.15 [skip ci] ([2a64a61](https://github.com/QQuik/quik_proximity_marketing/commit/2a64a6104e55244279a0aba53e779506c6574b13))
- **release:** 1.1.0-development.16 [skip ci] ([f897aa0](https://github.com/QQuik/quik_proximity_marketing/commit/f897aa0e405c8d576db5f3432994c532d8fc03c7))
- **release:** 1.1.0-development.17 [skip ci] ([1282d26](https://github.com/QQuik/quik_proximity_marketing/commit/1282d263b79362fd836110099610a83df8591a3b))
- **release:** 1.1.0-development.18 [skip ci] ([97e528b](https://github.com/QQuik/quik_proximity_marketing/commit/97e528b089ff2a419d77215c40c4dcc758b61475))
- **release:** 1.1.0-development.19 [skip ci] ([e17d06e](https://github.com/QQuik/quik_proximity_marketing/commit/e17d06e59d84f6c8b23ba3b547802fdbc5bda9d9))
- **release:** 1.1.0-development.2 [skip ci] ([e06fe7d](https://github.com/QQuik/quik_proximity_marketing/commit/e06fe7def7a3deeee42a334736fd366d3db3dc77))
- **release:** 1.1.0-development.20 [skip ci] ([2e2387b](https://github.com/QQuik/quik_proximity_marketing/commit/2e2387b7c6f92c39a0d2db0864695d66792db8fa))
- **release:** 1.1.0-development.21 [skip ci] ([45b161a](https://github.com/QQuik/quik_proximity_marketing/commit/45b161a8560335850077a4f6ec25342cdce0274a))
- **release:** 1.1.0-development.22 [skip ci] ([4b9089c](https://github.com/QQuik/quik_proximity_marketing/commit/4b9089cc246f44352afda1109f576ce39522781e))
- **release:** 1.1.0-development.3 [skip ci] ([d2439a0](https://github.com/QQuik/quik_proximity_marketing/commit/d2439a015a59406f30064b7fcc1083b24574a774))
- **release:** 1.1.0-development.4 [skip ci] ([fe3d840](https://github.com/QQuik/quik_proximity_marketing/commit/fe3d840153ffdf2311145cf0e270caa1c4b8b35e))
- **release:** 1.1.0-development.5 [skip ci] ([d8c6c74](https://github.com/QQuik/quik_proximity_marketing/commit/d8c6c74473614535a431396fc58575f5dc51e9b7))
- **release:** 1.1.0-development.6 [skip ci] ([8fa02d1](https://github.com/QQuik/quik_proximity_marketing/commit/8fa02d1ccaaf1c4cab8023f469aca120f3f098f9))
- **release:** 1.1.0-development.7 [skip ci] ([c7124ff](https://github.com/QQuik/quik_proximity_marketing/commit/c7124ff54a8bcdd46076527fdf104d866dd4c7ad))
- **release:** 1.1.0-development.8 [skip ci] ([af81683](https://github.com/QQuik/quik_proximity_marketing/commit/af81683cae43be956aa0696e8377bde06b7b393a))
- **release:** 1.1.0-development.9 [skip ci] ([f601fb2](https://github.com/QQuik/quik_proximity_marketing/commit/f601fb2b50cb6b8ac2467bd63bb360be640e10d9))
- sync db ([#522](https://github.com/QQuik/quik_proximity_marketing/issues/522)) ([3d675b1](https://github.com/QQuik/quik_proximity_marketing/commit/3d675b10beca7137cf9a9695acc2e2feca44e5d0))
- update encrypted development environment variables ([82d4912](https://github.com/QQuik/quik_proximity_marketing/commit/82d4912225e3a430fc12dd9da482c6e37787da20))

### 🎨 Code Style

- fix ui for destination analytic table ([93a15b9](https://github.com/QQuik/quik_proximity_marketing/commit/93a15b9bc2fec59ace3ce3c292612f625a5e179c))
- update ui style ([8c87aa7](https://github.com/QQuik/quik_proximity_marketing/commit/8c87aa753de84ae047d299928a8a68bfc3c9bd34))

### 🚀 Performance Improvements

- optimize QR code size and rendering based on content length ([e5e40cf](https://github.com/QQuik/quik_proximity_marketing/commit/e5e40cfe4e132abcbcdf169b9c732de1c46ecc95))

## [1.0.3](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2...v1.0.3) (2025-10-10)

### 🐛 Bug Fixes

- remove ip & fp limit for grant premium ([f7a4be6](https://github.com/QQuik/quik_proximity_marketing/commit/f7a4be6a8b78ef5dcb159e8032acf9d725f0a34a))

### 🛠 Updates

- re-enable lastloggedin ([#499](https://github.com/QQuik/quik_proximity_marketing/issues/499)) ([0c8f346](https://github.com/QQuik/quik_proximity_marketing/commit/0c8f346bd1ec72bb18a4ffb6a50de5d6b273247d))

### 🎨 Code Style

- update ui style ([519b3ee](https://github.com/QQuik/quik_proximity_marketing/commit/519b3ee617ffcefe132218acc8bf0cf193e9e13a))

## [1.0.2](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.1...v1.0.2) (2025-10-02)

### 🐛 Bug Fixes

- migrate wrong on ios ([#493](https://github.com/QQuik/quik_proximity_marketing/issues/493)) ([81b76c2](https://github.com/QQuik/quik_proximity_marketing/commit/81b76c2ccfc34bc459d97cde79244daa801ba6de))
- ts error ([0f49d47](https://github.com/QQuik/quik_proximity_marketing/commit/0f49d470c76dd4631a374ae93e719b2f07742532))
- ts error ([03eaa66](https://github.com/QQuik/quik_proximity_marketing/commit/03eaa66cd8fb3b81dff0c16b8cce8bea568b122a))
- typo in i18n ([71c3240](https://github.com/QQuik/quik_proximity_marketing/commit/71c3240f453d37ceca066e5bbd6e2f42a7b3f3af))

### 🛠 Updates

- remove classname button ([#492](https://github.com/QQuik/quik_proximity_marketing/issues/492)) ([8b9ae8d](https://github.com/QQuik/quik_proximity_marketing/commit/8b9ae8d236aa65855b8169555e6bad6ebea38d87))
- remove some unused translations lines and increase max-width for content value in touch point list ([#491](https://github.com/QQuik/quik_proximity_marketing/issues/491)) ([e79d0ff](https://github.com/QQuik/quik_proximity_marketing/commit/e79d0ff84a6d2381c0e55681078d8221461e75f4))
- translation to use qr link named ([#488](https://github.com/QQuik/quik_proximity_marketing/issues/488)) ([9e5777c](https://github.com/QQuik/quik_proximity_marketing/commit/9e5777c07d6a6ffddbdda35c87dd4923cd386f0e))
- translation to use qr link named ([#490](https://github.com/QQuik/quik_proximity_marketing/issues/490)) ([155cd2b](https://github.com/QQuik/quik_proximity_marketing/commit/155cd2b81181cb31803559b29f3c27c77c3f061b))

### 🧹 Chore

- **release:** 1.0.1-development.1 [skip ci] ([7ef3fb2](https://github.com/QQuik/quik_proximity_marketing/commit/7ef3fb253ef4a6e7c6afc1dc4658e7809cb12dc0))
- **release:** 1.0.1-development.2 [skip ci] ([faf68c7](https://github.com/QQuik/quik_proximity_marketing/commit/faf68c7c46010be2491b2fa3a1f4394cb226fd12))
- **release:** 1.0.1-development.3 [skip ci] ([8a7ce0c](https://github.com/QQuik/quik_proximity_marketing/commit/8a7ce0c6b7b26b0e4244dc05ef411882e3f83ae8))

## [1.0.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.0...v1.0.1) (2025-09-29)

### 🐛 Bug Fixes

- **cicd:** fix semantic release ([3044fe7](https://github.com/QQuik/quik_proximity_marketing/commit/3044fe7643b5c7b4973e509a60241ed39d448430))
- **cicd:** ref=main ([2cd6978](https://github.com/QQuik/quik_proximity_marketing/commit/2cd69780902409df33b9b4b6d586d507876917b2))
- **cicd:** remove change logs from dev ([ae97d18](https://github.com/QQuik/quik_proximity_marketing/commit/ae97d18fd2228f0bd7f491751e62d18b9726b7dd))
- update Next.js version and adjust dynamic import paths for i18n ([6e03b43](https://github.com/QQuik/quik_proximity_marketing/commit/6e03b43c7a5f2ee0be35b0f1889597d93c15e3ea))

### 🧹 Chore

- **release:** 1.0.0-development.1 [skip ci] ([9379855](https://github.com/QQuik/quik_proximity_marketing/commit/93798555e13290cf8b35a1df083f6517c21937e0))
- **release:** 1.0.0-development.2 [skip ci] ([b224ac8](https://github.com/QQuik/quik_proximity_marketing/commit/b224ac8f170b84d4bf0ccab8a6538c4c11a88ddd))
- **release:** 1.1.0-development.90 [skip ci] ([1247304](https://github.com/QQuik/quik_proximity_marketing/commit/1247304b07587d4ec06b5c5de353bc90da6268bd))
- reset for fresh semantic-release setup ([cbd8eab](https://github.com/QQuik/quik_proximity_marketing/commit/cbd8eabfc1cfd6d5442e4b2f009d936e2ae27477))
- reset for fresh semantic-release setup ([7a3b514](https://github.com/QQuik/quik_proximity_marketing/commit/7a3b51406f03da05a8eddbc9ae3b4386d80b5d7c))

## 1.0.0 (2025-09-29)

### ✨ Features

- "handle back btn for app" ([e8a8623](https://github.com/QQuik/quik_proximity_marketing/commit/e8a8623720f15ee363ebe311ecbde72423df097c))
- add 3 links per day limit and auto-delete after 7 days for anonymous touch points ([4b2fade](https://github.com/QQuik/quik_proximity_marketing/commit/4b2fade6b2617f9048c2c287d9e0da8e9bbf3032))
- add advanced analytic with mockup data ([#351](https://github.com/QQuik/quik_proximity_marketing/issues/351)) ([01ea0ec](https://github.com/QQuik/quik_proximity_marketing/commit/01ea0ececcb250ee0a0cf4a48cc0837b573d439e))
- add ai generate slug components ([8e09ba4](https://github.com/QQuik/quik_proximity_marketing/commit/8e09ba41141039e494f4c2a3a42f6a5678e656c9))
- add analytic view ([7f28531](https://github.com/QQuik/quik_proximity_marketing/commit/7f2853124aa76e28accf63c80267fd626b415b8c))
- add analytics for touch point & add comparison ([81d9f0b](https://github.com/QQuik/quik_proximity_marketing/commit/81d9f0b9e7e6d7d7c10a980cddb594b39ff1a1cb))
- add animation card ([25568da](https://github.com/QQuik/quik_proximity_marketing/commit/25568daaaf61395444615b78f1c82eebfa26f470))
- add app selection after login ([6278426](https://github.com/QQuik/quik_proximity_marketing/commit/6278426f7e1898c17f86cabb3f13b24d9ef5b42b))
- add app selection page with Proxify and Parcelvoy options ([d364117](https://github.com/QQuik/quik_proximity_marketing/commit/d36411748a828b45bf717d618386d563ece5a3c8))
- add audit log for email & registration event & first 200 premium grants ([495a252](https://github.com/QQuik/quik_proximity_marketing/commit/495a25205fb8a0df8d737138c9b3c591fca46648))
- add audit logs & new rpc func for campaign free 200 premium ([16b8acb](https://github.com/QQuik/quik_proximity_marketing/commit/16b8acbf73100aa056fdb522a0c54ac6b142f188))
- add behavior tabs with api ([#365](https://github.com/QQuik/quik_proximity_marketing/issues/365)) ([93600ec](https://github.com/QQuik/quik_proximity_marketing/commit/93600ec7fb90c0ea76834ce6796223ad648ecf9c))
- add behavior tabs with mockdata [#364](https://github.com/QQuik/quik_proximity_marketing/issues/364) ([caaf378](https://github.com/QQuik/quik_proximity_marketing/commit/caaf378e40672365d57c71bc76fd2a33beae35bb))
- add bootstrap client ([#388](https://github.com/QQuik/quik_proximity_marketing/issues/388)) ([3e247fc](https://github.com/QQuik/quik_proximity_marketing/commit/3e247fc1a84a37db163e39b1bdca728ad0b11fa5))
- add campaign detail page & touch point list & handle for touch point create/delete ([cdd5da2](https://github.com/QQuik/quik_proximity_marketing/commit/cdd5da26d5d7d37e4e0d01cfd9e5a1616b9493e0))
- add campaign management ([#16](https://github.com/QQuik/quik_proximity_marketing/issues/16)) ([06e6792](https://github.com/QQuik/quik_proximity_marketing/commit/06e6792380745bfc47270d0b892be077b0a68243))
- add chat-woot ([55d1da4](https://github.com/QQuik/quik_proximity_marketing/commit/55d1da48e6e29741c53c390764b54035dc62393e))
- add custom domain handle ([5027a47](https://github.com/QQuik/quik_proximity_marketing/commit/5027a470c52f55bea1441d47b14d8044764e74b7))
- add custom domain support for touch point short links ([636767c](https://github.com/QQuik/quik_proximity_marketing/commit/636767ccd593988d55400d3b745e70d352960361))
- add dashboard page & analytics page ([713e04f](https://github.com/QQuik/quik_proximity_marketing/commit/713e04fcc38701d60b2b13a466d6c504737e000b))
- add dashboard view & components ([de4d858](https://github.com/QQuik/quik_proximity_marketing/commit/de4d8580d3dbfb490b249bbf44a8bd6860ead1d8))
- add detail vietnam map & show list location ([febb4c5](https://github.com/QQuik/quik_proximity_marketing/commit/febb4c59cde20b1be07ba4ff6e3b556c50b268f3))
- add dialog when not found profile & new method to check premium ([b12e206](https://github.com/QQuik/quik_proximity_marketing/commit/b12e2065843e2466a33d321826cc5a2959350906))
- Add docusaurus ([b1da105](https://github.com/QQuik/quik_proximity_marketing/commit/b1da105c30483dd7c85c6dc172eb541166124f51))
- add domain verification flow and improve UI for custom domains ([3bab761](https://github.com/QQuik/quik_proximity_marketing/commit/3bab761f2132d88cf42fd9e7701ce474ba13da2f))
- add domain-based cookie handling for cross-subdomain authentication ([38550b0](https://github.com/QQuik/quik_proximity_marketing/commit/38550b004d0d947a6d06824b0edb75a73ab43fc6))
- add download button for QR code in migrated anonymous dialog ([cd884bb](https://github.com/QQuik/quik_proximity_marketing/commit/cd884bb08e84e7c17b4eaddbe492c2b867aeead3))
- add env scripts and encoded .env ([47dc4f0](https://github.com/QQuik/quik_proximity_marketing/commit/47dc4f00c76544827094b0a87b82e2a0fe22c179))
- add error boundary to log error into openobserve ([99b6913](https://github.com/QQuik/quik_proximity_marketing/commit/99b691323d326e28d7f6d36c15305261b99dd526))
- add expiration dates and SameSite policy to auth cookies ([92421db](https://github.com/QQuik/quik_proximity_marketing/commit/92421dbc392fd0b624ff4d8bff8a3660b4d48534))
- add expires at into orgplan ([6f94dfc](https://github.com/QQuik/quik_proximity_marketing/commit/6f94dfcee6b0c07aed95652d04454050fcc98520))
- add export json file in docker compose ([9f0e3d0](https://github.com/QQuik/quik_proximity_marketing/commit/9f0e3d052bdd24985d24c6a1f56a7ef9930789d8))
- add filter/search/sort reusable components & default config for react-query, axios,.. ([6f6b200](https://github.com/QQuik/quik_proximity_marketing/commit/6f6b200ba72eb59be65fb38705a234d4c40aa2df))
- add form dirty state tracking and reset functionality for QR customization ([ed893e4](https://github.com/QQuik/quik_proximity_marketing/commit/ed893e4c9f275e291118e46e290a4b637a237cda))
- add free premium for limit 5 ip & 1 fp ([d39e363](https://github.com/QQuik/quik_proximity_marketing/commit/d39e36338d9969419567f1c0b697425550730bec))
- add gtm id to entry app ([43aaadc](https://github.com/QQuik/quik_proximity_marketing/commit/43aaadcff62174d6254c3ece240e5851ee75a4c5))
- add host to allowed CORS headers in middleware ([09e8d1b](https://github.com/QQuik/quik_proximity_marketing/commit/09e8d1b90718c59043db6c141cf4a196f0d292c8))
- add i18n for server ([#325](https://github.com/QQuik/quik_proximity_marketing/issues/325)) ([5dbe9f2](https://github.com/QQuik/quik_proximity_marketing/commit/5dbe9f2c6d2cc66aa220f5321216875019a50eb1))
- add i18n support for error messages in react-query error handler ([67e1bc5](https://github.com/QQuik/quik_proximity_marketing/commit/67e1bc515a996a02ea4fbe593fda7bfaec7d9bb5))
- add i18n support for error messages with default fallbacks ([5249af9](https://github.com/QQuik/quik_proximity_marketing/commit/5249af9c180276f8d68620add84ce8c856db9576))
- add integration form for touch point ([da1e263](https://github.com/QQuik/quik_proximity_marketing/commit/da1e263406878de41d95292ea23184cdc71df473))
- add integration limit and plan tracking for organizations ([9e66808](https://github.com/QQuik/quik_proximity_marketing/commit/9e66808249beba802e60ca7131ab8baf9e059c06))
- add integration module to menulist ([11c12be](https://github.com/QQuik/quik_proximity_marketing/commit/11c12be99c5ecb35a301efe0eb7ad2ca416290eb))
- add invitation detail API and query hook ([3db891e](https://github.com/QQuik/quik_proximity_marketing/commit/3db891e9d40e7e0c3ae6e97863a84f93d59a34a2))
- add lazy load into advanced analytic overview page ([26ee8ba](https://github.com/QQuik/quik_proximity_marketing/commit/26ee8ba48b3dc42c6b04a36f1ec9cd12ea539956))
- add limit 200 for free pre ([233e9ca](https://github.com/QQuik/quik_proximity_marketing/commit/233e9ca0a82c61dc4073a1bc1936408596a233a5))
- add locale support for AI-generated slugs and improve error handling ([#410](https://github.com/QQuik/quik_proximity_marketing/issues/410)) ([bf592b0](https://github.com/QQuik/quik_proximity_marketing/commit/bf592b0cc95361adc81248d8564f12c2eea0d5ca))
- add localized format plugin and simplify anon touch points response structure ([a2a9107](https://github.com/QQuik/quik_proximity_marketing/commit/a2a9107ca1301efc84e2191bf48375b5c2bef97d))
- add login with google ([7f32180](https://github.com/QQuik/quik_proximity_marketing/commit/7f321805863ff1c20b977a8de54db63592dcf954))
- add maxLength validation to tag inputs with 32 character limit ([f8d031f](https://github.com/QQuik/quik_proximity_marketing/commit/f8d031fe0a2d4f78708d55baf5dcea39736e57a0))
- add member module ([662a0f6](https://github.com/QQuik/quik_proximity_marketing/commit/662a0f69182c8c04228640bbe0bdf66aca118026))
- add meta tags support for touch points with image upload ([6bc8823](https://github.com/QQuik/quik_proximity_marketing/commit/6bc8823f97002f824ca25aa239182bb564afe29c))
- add metadata as i18n ([5b35ffb](https://github.com/QQuik/quik_proximity_marketing/commit/5b35ffb67588fa68b3de965ccf0264a52cd3c4c0))
- add monthly plan for org & update plan lib ([#228](https://github.com/QQuik/quik_proximity_marketing/issues/228)) ([7000a5d](https://github.com/QQuik/quik_proximity_marketing/commit/7000a5d7ef6a20b925a185d50c8130a4d1d0e412))
- add name validation to touch point update schema with min/max length ([83869e9](https://github.com/QQuik/quik_proximity_marketing/commit/83869e95b93766ef88244466c7127a4a9be4ccf2))
- add NoDataIcon component and update UI styling across multiple components ([1b934fa](https://github.com/QQuik/quik_proximity_marketing/commit/1b934faee899c66b9c825697112f679f89c8d93b))
- add openobserve browser rum ([7d9a2fd](https://github.com/QQuik/quik_proximity_marketing/commit/7d9a2fd61161ad08e43801bd5c3798ff773999a8))
- add OPTIONS handler with CORS support for touch-point endpoints ([5e23d38](https://github.com/QQuik/quik_proximity_marketing/commit/5e23d3801e5c9a73f5dff64d4aa1b389bcf6bad7))
- Add organization member invitation with email notification and role management ([abc8363](https://github.com/QQuik/quik_proximity_marketing/commit/abc836362af621a623334971ffc154d9453d46a2))
- add pagination & sorting handle ([f67020b](https://github.com/QQuik/quik_proximity_marketing/commit/f67020b3d4f3d4315b0a9c59ca4607e067baa644))
- add permission handler for BE & FE ([aaa0ba4](https://github.com/QQuik/quik_proximity_marketing/commit/aaa0ba422105af81de88a989906f25de806e9edf))
- add QR logo image upload and customize options for touch points ([3f176fd](https://github.com/QQuik/quik_proximity_marketing/commit/3f176fda1ff5f758b74958f6db21c3235a7867e4))
- add queue auto verify domain ([d4c458a](https://github.com/QQuik/quik_proximity_marketing/commit/d4c458aa4349798e0d20326280e409c8a89245ea))
- add real api into advanced analytic ([#359](https://github.com/QQuik/quik_proximity_marketing/issues/359)) ([1324db1](https://github.com/QQuik/quik_proximity_marketing/commit/1324db175155458d5318b07fe829226ae49fac11))
- add release auto on cicd ([#334](https://github.com/QQuik/quik_proximity_marketing/issues/334)) ([bc59122](https://github.com/QQuik/quik_proximity_marketing/commit/bc591221d9131456e30e69becb8a6d1f2451b315))
- add reusable table ([89376ab](https://github.com/QQuik/quik_proximity_marketing/commit/89376abbe70b3c3cffbebc57cee9d924384aacf4))
- add sample config for nginx ([#201](https://github.com/QQuik/quik_proximity_marketing/issues/201)) ([927ad94](https://github.com/QQuik/quik_proximity_marketing/commit/927ad9439f6bf30cb32cb3434b7bd21cd54bacd5))
- add schedule calendar filter ([#32](https://github.com/QQuik/quik_proximity_marketing/issues/32)) ([c95bf7e](https://github.com/QQuik/quik_proximity_marketing/commit/c95bf7ec2b81f368fae5234b04612a352b32f8a5))
- add schedule delete action ([d367f55](https://github.com/QQuik/quik_proximity_marketing/commit/d367f5567675b82fa3736994c670d0a5cc05f679))
- add schedule schema & some schedule components ([8fb9384](https://github.com/QQuik/quik_proximity_marketing/commit/8fb9384eed0d5558379b7086d5b1c2601de4eac4))
- add service-to-service authentication with API key validation ([#432](https://github.com/QQuik/quik_proximity_marketing/issues/432)) ([29ec851](https://github.com/QQuik/quik_proximity_marketing/commit/29ec8518c555bad37af77bdde2f86e1362268199))
- add short code as default slug ([04f7e0c](https://github.com/QQuik/quik_proximity_marketing/commit/04f7e0ccde65ae5231110317a665dc3c7edcfc36))
- add show confirm dialog method to formwarning provider ([3da861a](https://github.com/QQuik/quik_proximity_marketing/commit/3da861a1bdfece689ac3841e72c342f75e8b9f5b))
- add start/end adornment support to Input component and update touch point domain management ([90ce548](https://github.com/QQuik/quik_proximity_marketing/commit/90ce548c84e4261ed5677195de83ce7ad4ae3238))
- add tag module & remove tp, location module ([ae4d040](https://github.com/QQuik/quik_proximity_marketing/commit/ae4d040e995f73b3a2fc72d555cd1fdb212b4861))
- add tag module & remove tp, location module ([5da4936](https://github.com/QQuik/quik_proximity_marketing/commit/5da49361fdbbdc48d8b1ec89714391537ebf5826))
- add timezone ([#348](https://github.com/QQuik/quik_proximity_marketing/issues/348)) ([b2112f3](https://github.com/QQuik/quik_proximity_marketing/commit/b2112f3ae964103e98d3eccece0eb1d3a6746328))
- add today performance & fix advanced form in tp ([3032f71](https://github.com/QQuik/quik_proximity_marketing/commit/3032f71e37d1ef4c13958c5ed4064fed53dae4c4))
- add token refresh handling and QR code URL tracking parameter ([4b3148d](https://github.com/QQuik/quik_proximity_marketing/commit/4b3148d4a2709d50bd0aa5a29e604eee0343d223))
- add tooltip & fix ui, new integration list UI ([18afa5e](https://github.com/QQuik/quik_proximity_marketing/commit/18afa5e53b5e573fb72fc26a471913b013fe196c))
- add topo map to view locations ([8030a1a](https://github.com/QQuik/quik_proximity_marketing/commit/8030a1a3e87ed5c50efb77bb9dd74c3f18f4cbc2))
- add touch point & location CRUD ([cce8213](https://github.com/QQuik/quik_proximity_marketing/commit/cce82133df29989f22cc46cca490fa6d48eae2df))
- add touch point advanced settings & utm form ([5d36cf3](https://github.com/QQuik/quik_proximity_marketing/commit/5d36cf3b72dc8388a6dd65ce1d69cc6092830d82))
- add touch point analytics page ([5498f11](https://github.com/QQuik/quik_proximity_marketing/commit/5498f111425445dbb0d522512267ef710691cf38))
- add touch point create/update/delete handle ([cd376a3](https://github.com/QQuik/quik_proximity_marketing/commit/cd376a391b3a5aa75afc059352225cd6d3512fbf))
- add touch point detail page & schedule components ([732d07b](https://github.com/QQuik/quik_proximity_marketing/commit/732d07bfc846f453c58542f8b0a1df044e99261f))
- add treafik to docker-compose.dev ([3d6a661](https://github.com/QQuik/quik_proximity_marketing/commit/3d6a6616fdfd38716705c61664aa4e6db20f0b7c))
- add ui & api for many modules ([a254d8c](https://github.com/QQuik/quik_proximity_marketing/commit/a254d8c14542371211ecd9b323ef5dce52b6eb8f))
- add user id to parcel get access token ([8659a69](https://github.com/QQuik/quik_proximity_marketing/commit/8659a698bd279cba99f51310ca1935faf2a2dcb6))
- add user tracking for custom slugs and disable account deletion temporarily ([cf652f3](https://github.com/QQuik/quik_proximity_marketing/commit/cf652f37b8dc32d5f6cf22140c37e90bb61f3b30))
- add verify url on tp form ([3f3d52c](https://github.com/QQuik/quik_proximity_marketing/commit/3f3d52c141093ebdbc88f16cf0f43fc8016ef75e))
- add vitest & remove docs ([#322](https://github.com/QQuik/quik_proximity_marketing/issues/322)) ([382a5ec](https://github.com/QQuik/quik_proximity_marketing/commit/382a5ecb6aac211d76469244131e3f1cdc979d92))
- change plan provider ([47f7687](https://github.com/QQuik/quik_proximity_marketing/commit/47f7687774b4c19575a3bfb13cb13abd29b25ba8))
- comment old file & add git workflows file ([#17](https://github.com/QQuik/quik_proximity_marketing/issues/17)) ([7a8cbb6](https://github.com/QQuik/quik_proximity_marketing/commit/7a8cbb6e2d8427996a7653e0b4ba5650491ae32b))
- create qr svg when user create tp ([199eb61](https://github.com/QQuik/quik_proximity_marketing/commit/199eb617138f3a6cd564c9b87cd589dec7efc0bf))
- enhance CreateDomainForm and API response structure with improved error handling and new types ([b8e13a5](https://github.com/QQuik/quik_proximity_marketing/commit/b8e13a51f836fcf7f34dea0c9dfdfb190ebe0d9b))
- enhance error handling in touch point creation with rollback and localized messages ([ab889ac](https://github.com/QQuik/quik_proximity_marketing/commit/ab889ac9a397392327991997d2cfb7ebae04e314))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([60f6509](https://github.com/QQuik/quik_proximity_marketing/commit/60f6509b9c53a04b3ffc1a6b201bcaf3058f4ef2))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([9282d60](https://github.com/QQuik/quik_proximity_marketing/commit/9282d60f154eaa6beac85f7c73b4b76f7ffb950f))
- fix login page ([e270ca5](https://github.com/QQuik/quik_proximity_marketing/commit/e270ca546811a3176e5e26490473e255312d0e38))
- fix refresh token invalid cause app redirect multi times ([ebfd588](https://github.com/QQuik/quik_proximity_marketing/commit/ebfd588af1041631d98747f14dc1eef4994a62cf))
- fix some bugs & add plan for meta tags ([838e18f](https://github.com/QQuik/quik_proximity_marketing/commit/838e18fcce4dbd5a606b5174c01412025dc9a152))
- handle form for condition node ([ff3c273](https://github.com/QQuik/quik_proximity_marketing/commit/ff3c2734ec9e1ed6216949354ce869e178377c7d))
- handle unsave form aleart ([2df70e4](https://github.com/QQuik/quik_proximity_marketing/commit/2df70e441c18e9870306ab69a5d5ace3b8fe71e7))
- implement activity line chart with daily trend visualization and analytics ([#360](https://github.com/QQuik/quik_proximity_marketing/issues/360)) ([7535f4c](https://github.com/QQuik/quik_proximity_marketing/commit/7535f4c239b457ebe925859393bbe50ab303ae93))
- implement advanced analytics filtering with tags and touchpoints selection ([3cd7105](https://github.com/QQuik/quik_proximity_marketing/commit/3cd7105411a5bd0acaf6c9738376239bbadadbe8))
- implement advanced filter UI with tag and touchpoint selection ([128412d](https://github.com/QQuik/quik_proximity_marketing/commit/128412ddfca1a2187a477b3ea9678e54efaa8ec3))
- implement AI provider key rotation and caching system for slug generation ([4fbb948](https://github.com/QQuik/quik_proximity_marketing/commit/4fbb948a86fb2a369e7c661ce3f98cb42938253a))
- implement AI-powered slug generation with LiteLLM and Firecrawler integration ([cfd6035](https://github.com/QQuik/quik_proximity_marketing/commit/cfd603557c501316c54509a00b21b7868c744712))
- implement anon migration with pending touch points and user profile API ([#422](https://github.com/QQuik/quik_proximity_marketing/issues/422)) ([bd22dd9](https://github.com/QQuik/quik_proximity_marketing/commit/bd22dd9698ec67a76084dce2508b8fcd595cc143))
- implement anonymous touch points API with middleware and schema validation ([85f0217](https://github.com/QQuik/quik_proximity_marketing/commit/85f0217dd263a00bab558470ac1fb222afaf833c))
- implement anonymous touch points API with repository and service layers ([6bbb254](https://github.com/QQuik/quik_proximity_marketing/commit/6bbb254cd592e86959f8aad808dd5002e3f14624))
- implement auth refresh and logout endpoints with cookie management ([2947847](https://github.com/QQuik/quik_proximity_marketing/commit/294784782360d28fb4a7ca14c6f3c01bfeda7a58))
- implement CORS middleware with domain allowlist for public API endpoints ([55da9f6](https://github.com/QQuik/quik_proximity_marketing/commit/55da9f66e4aba8f56b3f216acb91f91e614217cf))
- implement flow builder with drag-and-drop nodes and properties sidebar ([d8ce71b](https://github.com/QQuik/quik_proximity_marketing/commit/d8ce71b02f7e14f3891d35c52b86697730848c84))
- implement i18n on api & zod ([#380](https://github.com/QQuik/quik_proximity_marketing/issues/380)) ([c6a47e8](https://github.com/QQuik/quik_proximity_marketing/commit/c6a47e8debc39c3ffb550c880063ae175af71d69))
- implement locale and timezone management with dayjs integration ([5843c0f](https://github.com/QQuik/quik_proximity_marketing/commit/5843c0f4b7c220b81b0e5ea78c42b856dbde8541))
- implement server-side timezone and locale handling with dayjs integration ([35841cf](https://github.com/QQuik/quik_proximity_marketing/commit/35841cff7947172880f83327032f2ee49fb34eb5))
- implement timezone handling across analytics and dashboard components ([e58fbbd](https://github.com/QQuik/quik_proximity_marketing/commit/e58fbbdaa587ab4d63ea06f3f7eb209739ac0593))
- init analytic page ([01b2000](https://github.com/QQuik/quik_proximity_marketing/commit/01b20005ceada2704fc3db57f07a8382631da7cc))
- init glitch ([daf9ba6](https://github.com/QQuik/quik_proximity_marketing/commit/daf9ba6cbfb41b53b7b9b9e722cf94eb77505670))
- init permissions ([1dd69f2](https://github.com/QQuik/quik_proximity_marketing/commit/1dd69f261f5682cbf34c81ec6ecefa7494db603a))
- init prj ([424a864](https://github.com/QQuik/quik_proximity_marketing/commit/424a86475e7ee361d598cc1deb8825a71953dc2e))
- limit active time range display to 3 hours in channel analysis ([05ff693](https://github.com/QQuik/quik_proximity_marketing/commit/05ff6935e69fad2313a72d067228396442fed061))
- limit anonymous users to 1 total touch point instead of 3 per day ([96ed895](https://github.com/QQuik/quik_proximity_marketing/commit/96ed895a73287a5db752c54d794cb8e89cca9afa))
- Migrate organization provider to Zustand store and add form warning provider ([d560fa2](https://github.com/QQuik/quik_proximity_marketing/commit/d560fa2e637840e97b4d02c88c232c4c44a0252b))
- modify code & add hook & api for advanced analytics ([#355](https://github.com/QQuik/quik_proximity_marketing/issues/355)) ([e3f639c](https://github.com/QQuik/quik_proximity_marketing/commit/e3f639c36a90ac0d406cc45acc92fb6c29b35915))
- modify script and workflow to work with .env.development ([e1b2d5c](https://github.com/QQuik/quik_proximity_marketing/commit/e1b2d5cec75565b09fe92c284c5c8e9f7a6e2ba2))
- modify UI & flow ([7102a0f](https://github.com/QQuik/quik_proximity_marketing/commit/7102a0f859b7cd7369decaf3689a446f7e39ebcc))
- move custom domains to dedicated page and improve filter UI ([43aa0a3](https://github.com/QQuik/quik_proximity_marketing/commit/43aa0a317879bfb688e9744c37870959a482032a))
- new tp flow for qr nfc wifi ([21b88b5](https://github.com/QQuik/quik_proximity_marketing/commit/21b88b59bdb29a8742747138b3ddf19fcfbeaa45))
- now chart map can show data ([6800fcc](https://github.com/QQuik/quik_proximity_marketing/commit/6800fcc9f9cb0c7f7a64aef0174b8f919781f8e5))
- realtime data tab ([#373](https://github.com/QQuik/quik_proximity_marketing/issues/373)) ([3f8d16f](https://github.com/QQuik/quik_proximity_marketing/commit/3f8d16fc680f6d4adc6122732af35413be89f77a))
- refactor table actions ([7817055](https://github.com/QQuik/quik_proximity_marketing/commit/7817055dd1d2f135afd66a361471b4435d767b31))
- refactor URL validation and add country mapping center coordinates ([97f8a6e](https://github.com/QQuik/quik_proximity_marketing/commit/97f8a6e902a1c102ac2b8b68c4dfddbf3e042d49))
- remove app url on env ([a277b5b](https://github.com/QQuik/quik_proximity_marketing/commit/a277b5bff118b73e9de18eb0ef93559ea1dc0246))
- Remove schedule and location features, update permission handling ([ddf7c49](https://github.com/QQuik/quik_proximity_marketing/commit/ddf7c492f7d7ecc784c7c68a386caed1e48d8be6))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([79cd2e5](https://github.com/QQuik/quik_proximity_marketing/commit/79cd2e5cfbaafc36ad0d82a1bdc4a840c5286791))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([4c5cecf](https://github.com/QQuik/quik_proximity_marketing/commit/4c5cecfba646b327a6936e5ddd7f659f84a082dc))
- responsive tablet in layout + some list page ([#203](https://github.com/QQuik/quik_proximity_marketing/issues/203)) ([5f29ad9](https://github.com/QQuik/quik_proximity_marketing/commit/5f29ad94e15271f5c54a8f881d2594760931b9e3))
- set casdoor token for supabase client ([1855554](https://github.com/QQuik/quik_proximity_marketing/commit/18555541eb32b780f035d3f9a580022830486bd4))
- sidebar handle for mobile & tablet & desktop ([2a14b80](https://github.com/QQuik/quik_proximity_marketing/commit/2a14b80f73af8149fb5681c53d09b511a099c949))
- split upload logics ([943c00e](https://github.com/QQuik/quik_proximity_marketing/commit/943c00eb71f0cdb7e0f4aa4dc10d66cf5494185c))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([afb57dd](https://github.com/QQuik/quik_proximity_marketing/commit/afb57dd29b77579aae2d58b23b6cb52e1a5a6a24))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([2f8b975](https://github.com/QQuik/quik_proximity_marketing/commit/2f8b975ce1c5aaec1e058fd10496aa0d144ae53c))
- update authenticator app ([bbbcf20](https://github.com/QQuik/quik_proximity_marketing/commit/bbbcf20c493721a2e2f29a62df63428971cdf95d))
- update better ui for url verification in create tp ([1672231](https://github.com/QQuik/quik_proximity_marketing/commit/1672231f571d04720799a88cdc86fe684603c664))
- update custom domain UI & add docs to vscode ignore ([#199](https://github.com/QQuik/quik_proximity_marketing/issues/199)) ([732dfc9](https://github.com/QQuik/quik_proximity_marketing/commit/732dfc90d26c8e5a305d9c2bd589e75985e65057))
- update custom utm ([b6c19aa](https://github.com/QQuik/quik_proximity_marketing/commit/b6c19aa5cfbf8519f6b6bb039184e716e042a8fa))
- update env ([f35fa72](https://github.com/QQuik/quik_proximity_marketing/commit/f35fa729a9004f3f0607bc5258909f453e41f49f))
- update ESLint rules, enhance Next.js config, and add Docker support ([bac1548](https://github.com/QQuik/quik_proximity_marketing/commit/bac1548de7731659bba72439654e6d30557ff3fe))
- update ESLint rules, enhance Next.js config, and add Docker support ([80becff](https://github.com/QQuik/quik_proximity_marketing/commit/80becff7e71ba7d643a09b56a3af6aadcc17f434))
- update free premium for block limit ([330fdb4](https://github.com/QQuik/quik_proximity_marketing/commit/330fdb442ec0d00ae5ac51772554caf4293a0968))
- update gg auth ([4cc8cc5](https://github.com/QQuik/quik_proximity_marketing/commit/4cc8cc5e3017779bce668106bb9d5527682a8eb6))
- update integration ([4c27835](https://github.com/QQuik/quik_proximity_marketing/commit/4c278359fad4f23242bdef7e6fa8e2f822ed4917))
- update integration UI & add logger pino ([f68afd9](https://github.com/QQuik/quik_proximity_marketing/commit/f68afd9c0e01ce3822b81ceab5a5fcc6e2cd52bb))
- update limit domain ([340c818](https://github.com/QQuik/quik_proximity_marketing/commit/340c81864c392b82f90d94813a862cb5f7fa9007))
- update mail mfa ([cc4bd5b](https://github.com/QQuik/quik_proximity_marketing/commit/cc4bd5b997f6ad093bd55715d2c315e9419cb356))
- update mail mfa ([866e5a9](https://github.com/QQuik/quik_proximity_marketing/commit/866e5a932c860360b38ce72b609ae84052139483))
- update mfa ui ([98c87c2](https://github.com/QQuik/quik_proximity_marketing/commit/98c87c2622ba1fd3d42e683256a377a18dc12770))
- update plan ([fe5407d](https://github.com/QQuik/quik_proximity_marketing/commit/fe5407d4eec8a39eb4766a1111c392b80b93ca8c))
- update plan ([fd2d0d2](https://github.com/QQuik/quik_proximity_marketing/commit/fd2d0d2b2b0c6b08ed5494a68fefd5ccfd5a5854))
- update plans ([1621f35](https://github.com/QQuik/quik_proximity_marketing/commit/1621f353c5fabbf8ca5fe861ecb67d241ed0eadf))
- update plans ([8750f97](https://github.com/QQuik/quik_proximity_marketing/commit/8750f9776e990c49d8956e59a2606f640047968f))
- update redis ([a63ddca](https://github.com/QQuik/quik_proximity_marketing/commit/a63ddca09f44d485bffb219d47ece44a1e1e2b39))
- update responsive for sidebar & navbar ([192921a](https://github.com/QQuik/quik_proximity_marketing/commit/192921a5a97d580af2bf15d7a655a3ddde220232))
- update sidebar ui ([27b49dc](https://github.com/QQuik/quik_proximity_marketing/commit/27b49dc75f582ee650f1e7d4ca22eb78d2da9145))
- update ui for tp advanced settings & tp update slug ([8b84bc1](https://github.com/QQuik/quik_proximity_marketing/commit/8b84bc10abe35956aee33d59c44eb3ef71c66d1e))
- update ui version 1.0 for acquistions and hide the attribute override… ([#358](https://github.com/QQuik/quik_proximity_marketing/issues/358)) ([dc0ab5a](https://github.com/QQuik/quik_proximity_marketing/commit/dc0ab5aa43dd2ab483d99c9ffb3515988b02687a))

### 🐛 Bug Fixes

- 0.0.0.0 in redirect url ([27f786f](https://github.com/QQuik/quik_proximity_marketing/commit/27f786fe9b441d70728cb81e88b1b595d614bd32))
- 404 button ([#336](https://github.com/QQuik/quik_proximity_marketing/issues/336)) ([2989283](https://github.com/QQuik/quik_proximity_marketing/commit/29892831200c0bde453edf30d78edd03f66a96e3))
- active not make form dirty ([a3d716e](https://github.com/QQuik/quik_proximity_marketing/commit/a3d716ef6b1adfb08adf1860366c6412842a6a19))
- add cookie to i18n detection ([9702ee3](https://github.com/QQuik/quik_proximity_marketing/commit/9702ee3a94cabb745b50f8539cd0654587991cad))
- add expires time for supabase jwt ([fb3e39c](https://github.com/QQuik/quik_proximity_marketing/commit/fb3e39c2a6d66cfbbe9f8f442a7139a06b1ec063))
- add https protocol to custom domain in short link ([f5e4082](https://github.com/QQuik/quik_proximity_marketing/commit/f5e4082f2e3f638a68cbf0a9e6ecbeee469e1d76))
- add key prop to Card component to resolve React warning ([c19fe66](https://github.com/QQuik/quik_proximity_marketing/commit/c19fe6668e3347df8ac317d8c10f29acde4dc3fc))
- add plan limit & lockable section ([6d09513](https://github.com/QQuik/quik_proximity_marketing/commit/6d095136c0ec703cfa27df64f88c492a80aa2ec8))
- add ts-ignore to suppress type error in QR color options update ([4aeaf58](https://github.com/QQuik/quik_proximity_marketing/commit/4aeaf586840a9bb74a95f81847daa0caceb6811e))
- adding type button to ai optimize btn ([#407](https://github.com/QQuik/quik_proximity_marketing/issues/407)) ([8ee1ab7](https://github.com/QQuik/quik_proximity_marketing/commit/8ee1ab72cb4993aac9beea0bef4ee19a9ff8588a))
- allow empty utm id ([44025fa](https://github.com/QQuik/quik_proximity_marketing/commit/44025fa1a75ed8d59a17d0cd08c40aeae3025a63))
- analytic advanced & some error ([baba42b](https://github.com/QQuik/quik_proximity_marketing/commit/baba42b1600f6dc2c05897808875df8aafbde1fd))
- animation ([011f829](https://github.com/QQuik/quik_proximity_marketing/commit/011f8291a89408768bd2718562bd75f8e4521c24))
- api called multi times when filter by created at ([383e82d](https://github.com/QQuik/quik_proximity_marketing/commit/383e82d7710798fd76371de3632a46fab21ebf33))
- audit vulnerability ([2f95a23](https://github.com/QQuik/quik_proximity_marketing/commit/2f95a238482099e55727d361e90e355c2034206f))
- banner ([26a134c](https://github.com/QQuik/quik_proximity_marketing/commit/26a134c305cda328a22c51dcdec13b24449458ab))
- bug that cant add domains ([f047c4c](https://github.com/QQuik/quik_proximity_marketing/commit/f047c4c15295502c94058017177337fd5c0d902d))
- build error ([250fd87](https://github.com/QQuik/quik_proximity_marketing/commit/250fd87d6bafad99e2b1b47a11cbb32d6c7ad72f))
- build error by correct null check ([#369](https://github.com/QQuik/quik_proximity_marketing/issues/369)) ([5014422](https://github.com/QQuik/quik_proximity_marketing/commit/5014422e1d9f00fa06b99f3b4a4686a13897249e))
- calculate time left for first time, not wait for first interval ([1d08f07](https://github.com/QQuik/quik_proximity_marketing/commit/1d08f07da08e6751f31df86956c7eefc616f1dfe))
- cancel zalo widget ([4239217](https://github.com/QQuik/quik_proximity_marketing/commit/4239217c7c5ffa9d94d46d4a598a807a4fff5734))
- change animation navbar ([1aac6c9](https://github.com/QQuik/quik_proximity_marketing/commit/1aac6c9722fff2c2bd973885af9efb5994907fc2))
- change default qr logo and fix dayjs usage in tp list ([#480](https://github.com/QQuik/quik_proximity_marketing/issues/480)) ([801eb32](https://github.com/QQuik/quik_proximity_marketing/commit/801eb32b3ff7dda7177419d9a94f583e4053d152))
- change due to comment ([c6e8d1a](https://github.com/QQuik/quik_proximity_marketing/commit/c6e8d1a36cab0bc2e35f7880c1677b3e2323b4d2))
- change env & fix api for tags ([be08057](https://github.com/QQuik/quik_proximity_marketing/commit/be08057682be4fff39f21fde529d5d8fefcf64c9))
- change gtm to ga ([a0c62cb](https://github.com/QQuik/quik_proximity_marketing/commit/a0c62cb06112e7ab6d4b183652fda9a692fe3e10))
- change supabase from public into private ([44bec4d](https://github.com/QQuik/quik_proximity_marketing/commit/44bec4d9f1ccf1a329d14211dade3bb4a33bee36))
- **cicd:** fix semantic release ([4eeed0d](https://github.com/QQuik/quik_proximity_marketing/commit/4eeed0da39a7e0827041e5866e925c4f8c7879ab))
- **cicd:** ref=main ([8eb685a](https://github.com/QQuik/quik_proximity_marketing/commit/8eb685aa141df57e9215d005a667c0cd5586cd8a))
- **cicd:** release only on main ([ed6f583](https://github.com/QQuik/quik_proximity_marketing/commit/ed6f5831d7b82a7dc97717d5005ebbb983792888))
- clear old file ([452d97c](https://github.com/QQuik/quik_proximity_marketing/commit/452d97c7df4941f658014845968cf48a1f5b06a5))
- clear some file ([e679299](https://github.com/QQuik/quik_proximity_marketing/commit/e679299b42017eb8a8a95e5d26449a5e4367eb2c))
- conflict ([8d9c4ad](https://github.com/QQuik/quik_proximity_marketing/commit/8d9c4adc594eaaf604bccfdf08e29a527b2de5c2))
- conflict ([c525ab1](https://github.com/QQuik/quik_proximity_marketing/commit/c525ab1c2cea53fc169e797b6dd289060fb201e2))
- conflict ([e7f0b90](https://github.com/QQuik/quik_proximity_marketing/commit/e7f0b905a2abc1a0017a67dd96ef2b1f45885a65))
- conflict ([2146389](https://github.com/QQuik/quik_proximity_marketing/commit/2146389e4971c4a0e549caae05071fb00596d762))
- conflict & add module integrations ([d2a147e](https://github.com/QQuik/quik_proximity_marketing/commit/d2a147ec98255c9deb71e3b0a5f4e2bd8a2e5af9))
- cookie i18n ([9e38d7b](https://github.com/QQuik/quik_proximity_marketing/commit/9e38d7b815f7f6ebd187b780f8f1bf523f193e03))
- cookie will work after this last fix ([ce926ce](https://github.com/QQuik/quik_proximity_marketing/commit/ce926cee2078c3ae6e4dc02c17b8ca9f9dd91aac))
- copy qr on svg type ([1c25899](https://github.com/QQuik/quik_proximity_marketing/commit/1c25899e29bee1f9965cd3f3baa4925213324dab))
- correct response schema ([9684d3f](https://github.com/QQuik/quik_proximity_marketing/commit/9684d3f0373603c3727af8e96d07501c775da432))
- create tp form ([71f12f1](https://github.com/QQuik/quik_proximity_marketing/commit/71f12f1d6553829754c6adccab186927ca87d2bb))
- created_at filter not work ([58c42ce](https://github.com/QQuik/quik_proximity_marketing/commit/58c42cefefa9ddde094599da51b97f754836d0e3))
- dashboard crash by data undifined ([08c3110](https://github.com/QQuik/quik_proximity_marketing/commit/08c31101564785ae7385df4acfd0ed6b54a0afab))
- db-type ([338354a](https://github.com/QQuik/quik_proximity_marketing/commit/338354a106f0df0ed990cdee1c6a4fa1bb5f8fdd))
- deselect when change campaign in analytics page ([acfb11d](https://github.com/QQuik/quik_proximity_marketing/commit/acfb11d4337c3af89879e36d6d5dc5837f761f82))
- dialog break dom ([2bdd21a](https://github.com/QQuik/quik_proximity_marketing/commit/2bdd21aa234034cfd9ff500bb304d37a53bf74a5))
- docker compose ([0a36a09](https://github.com/QQuik/quik_proximity_marketing/commit/0a36a090e1187b58f378e835541a1e0cea7cc9f4))
- dockerfile for node-canvas ([c59ca22](https://github.com/QQuik/quik_proximity_marketing/commit/c59ca228a4fbb7a1f7ff830c7af2267fdb923c3e))
- domain not have https ([e6e973e](https://github.com/QQuik/quik_proximity_marketing/commit/e6e973e29ff3a757830a3ec5062a0c9c22626dc1))
- duplicate create access token ([e447040](https://github.com/QQuik/quik_proximity_marketing/commit/e4470401982e919515eb8c8f55a0923c6f1b7601))
- empty response message ([1c21bc8](https://github.com/QQuik/quik_proximity_marketing/commit/1c21bc8962c0b57adcebb8d04ddb8305dd2efbfe))
- Enhance form validation and empty section component with better UI/UX ([4736533](https://github.com/QQuik/quik_proximity_marketing/commit/47365339b2f4cdad8ba12372c511637b64f0c4c5))
- ensure cookies are always deleted regardless of domain during logout ([1559620](https://github.com/QQuik/quik_proximity_marketing/commit/155962076fdefeb87a60cc0a645163570aeab831))
- env change to work on client side ([953dc4b](https://github.com/QQuik/quik_proximity_marketing/commit/953dc4bdcc18893a95b76f1a2575ecd01466039c))
- env de ([6f365ca](https://github.com/QQuik/quik_proximity_marketing/commit/6f365caebb0b7d80dec84ff0289e8a3da0cc22bf))
- env local ([dc6c5c8](https://github.com/QQuik/quik_proximity_marketing/commit/dc6c5c864ae2d1eb4f9ae0dfe79bddc7f652d779))
- error on tree select ([9c2c974](https://github.com/QQuik/quik_proximity_marketing/commit/9c2c9748cdc00533f2e9f9957e5dbe6514466a5b))
- error that make free user can edit metatags ([850d0a8](https://github.com/QQuik/quik_proximity_marketing/commit/850d0a84e8ecfb96dacad6018f9289fe24eabff6))
- error ts ([583e937](https://github.com/QQuik/quik_proximity_marketing/commit/583e9376bfd511556a7e5eb0f5ca151ee3bea371))
- error when backing on proxify ([a52ac8f](https://github.com/QQuik/quik_proximity_marketing/commit/a52ac8f151a84c65d17629a61ffea3bbbd19e3e0))
- error when null data ([#371](https://github.com/QQuik/quik_proximity_marketing/issues/371)) ([8a3e97d](https://github.com/QQuik/quik_proximity_marketing/commit/8a3e97d1e7f5b3ce908c742abf9d70bc698ac91b))
- error" ([e22b124](https://github.com/QQuik/quik_proximity_marketing/commit/e22b1242acdb3a8d26b2ca8a4d7d87d922488403))
- error" ([c9f1f01](https://github.com/QQuik/quik_proximity_marketing/commit/c9f1f0102313db7f5270d38ce1cf2facac48f956))
- filter time error on tp analytics ([5f5319f](https://github.com/QQuik/quik_proximity_marketing/commit/5f5319fafb03ed55495d9cf6c828d1cc6b108938))
- fix banner ([5c474c1](https://github.com/QQuik/quik_proximity_marketing/commit/5c474c1995cf5f217f5e0ead2df57ed2c8fbac1f))
- fix bug mfa ([f273182](https://github.com/QQuik/quik_proximity_marketing/commit/f2731823600d31a0e1a26d3abdaba65f199b05ba))
- fix cicd & releaserc ([2882c87](https://github.com/QQuik/quik_proximity_marketing/commit/2882c87342b4c7bf3ae0ca19427ea0dc8322006e))
- fix env ([0d2e41e](https://github.com/QQuik/quik_proximity_marketing/commit/0d2e41e9994f04cc11b63b0e2f6ab3276d1cf2be))
- fix error when null data fetching ([#370](https://github.com/QQuik/quik_proximity_marketing/issues/370)) ([2ef0f8b](https://github.com/QQuik/quik_proximity_marketing/commit/2ef0f8b66716fa8c7f911780db66840861f0b35e))
- fix key mail ([7a0e9e1](https://github.com/QQuik/quik_proximity_marketing/commit/7a0e9e1dd35a7f6edaabcdf14df98c41ada863ec))
- fix mail ([e18d9e2](https://github.com/QQuik/quik_proximity_marketing/commit/e18d9e2181e9fc095879d56a5ca627562e903457))
- fix metatag & utm tag logic ([48a10a8](https://github.com/QQuik/quik_proximity_marketing/commit/48a10a8bf3c4420075360290738460d35f145953))
- fix mfa ([4cc228f](https://github.com/QQuik/quik_proximity_marketing/commit/4cc228f163f467ae29d8733965e00ee7eed676ac))
- fix utm tags ([78a7919](https://github.com/QQuik/quik_proximity_marketing/commit/78a79192f3bff84c4c5198a7b42735ffc85a1722))
- force push when delete touch point ([4e6ec24](https://github.com/QQuik/quik_proximity_marketing/commit/4e6ec24306f21821c30ffbd6edabf6156a7f2830))
- force push when delete touch point ([9a16ac6](https://github.com/QQuik/quik_proximity_marketing/commit/9a16ac639e8f4714e1a21edceeee1505a09b8663))
- form not change state when upload image ([751331a](https://github.com/QQuik/quik_proximity_marketing/commit/751331a1584dfdb4291d3e108d4ebfb84977c55a))
- format error ([366fb89](https://github.com/QQuik/quik_proximity_marketing/commit/366fb89b1944ac38f8918584326b65dab62984d8))
- GTM ID regex ([2ea0a3b](https://github.com/QQuik/quik_proximity_marketing/commit/2ea0a3b4b193013d5b4083343a1c46b586c36b4d))
- handle cookie domain for production environment in auth routes ([f7b1aaa](https://github.com/QQuik/quik_proximity_marketing/commit/f7b1aaa85a7cb57960395a290679b5ae6fee6aed))
- handle null createdTpId in rollback and improve type safety ([2c15143](https://github.com/QQuik/quik_proximity_marketing/commit/2c15143a3c35927f816fead761db75105c7bab92))
- heatmap hover ([f1cbdb2](https://github.com/QQuik/quik_proximity_marketing/commit/f1cbdb2c1ed163037731d9071f623c2ac3bb661a))
- heatmap wrong color ([59840c7](https://github.com/QQuik/quik_proximity_marketing/commit/59840c718f788f354f21562f2548f27e20f3d655))
- hide performance overview + back btn in tp detail ([63ec355](https://github.com/QQuik/quik_proximity_marketing/commit/63ec355645f08c5c19456fffd33c61fcdc818750))
- hot fix table rows ([ddc4500](https://github.com/QQuik/quik_proximity_marketing/commit/ddc4500a799a68adc5f592202d4fda06fa55c085))
- hot fixx ([5594f85](https://github.com/QQuik/quik_proximity_marketing/commit/5594f854bc973a37475f4603917e7fbb058f5bf0))
- i18n cookie ([3e3f0f2](https://github.com/QQuik/quik_proximity_marketing/commit/3e3f0f21e42fb4faa885abc78caaf88e0411c104))
- import error ([cc85aa3](https://github.com/QQuik/quik_proximity_marketing/commit/cc85aa32ffcb7d37e1f978435f1ae81bf52d26f9))
- import error ([fe66bc5](https://github.com/QQuik/quik_proximity_marketing/commit/fe66bc5d041d162a4d6041ddccdbc095742191e6))
- include 403 status in token refresh interceptor logic ([db1f155](https://github.com/QQuik/quik_proximity_marketing/commit/db1f1558323eaed7f92d899fd21600afd2da5892))
- initial value error ([822e7fc](https://github.com/QQuik/quik_proximity_marketing/commit/822e7fc8400a83ed4f27ba10f2c75c8d348ca7be))
- layout ([5b641a3](https://github.com/QQuik/quik_proximity_marketing/commit/5b641a3eb41c2f7b45ce4a972b2a74617d7970a7))
- layout ([c9c6904](https://github.com/QQuik/quik_proximity_marketing/commit/c9c6904b482750c51dcf8721b7d93d8eeae52756))
- loading org not work ([f42c7b3](https://github.com/QQuik/quik_proximity_marketing/commit/f42c7b32ebd301c4141086a5e3d7fa07e4363e2f))
- loading state on i18n ([de41769](https://github.com/QQuik/quik_proximity_marketing/commit/de4176957f34fbf38a0110c2718ff0acdfd99e85))
- lockable section error ([8589b6d](https://github.com/QQuik/quik_proximity_marketing/commit/8589b6d11927b921c0786958a08cc5305ede2f10))
- make sidebar default show ([87b2f22](https://github.com/QQuik/quik_proximity_marketing/commit/87b2f22066eee9462043c6678623ea04d8e9dca8))
- make sidebar smooth when change from desktop to tablet ([b11da70](https://github.com/QQuik/quik_proximity_marketing/commit/b11da708783cd5a2f2d5205ab6b420ca2e397bcb))
- mapping country not work ([88ed73f](https://github.com/QQuik/quik_proximity_marketing/commit/88ed73ff9e2ae6659bc1ff28f85cdb5711fb1ac4))
- merge error ([b347f42](https://github.com/QQuik/quik_proximity_marketing/commit/b347f425299fea668779b7ffcdba789767919e1d))
- metatag error ([7dbb596](https://github.com/QQuik/quik_proximity_marketing/commit/7dbb596a1fbfb6469d588e5b8af1424b1a7713ac))
- middleware error ([41398e2](https://github.com/QQuik/quik_proximity_marketing/commit/41398e2b69e48e590d00a8e21c7abf9c9d5a3645))
- middleware for public page ([b00ab17](https://github.com/QQuik/quik_proximity_marketing/commit/b00ab170f6036f4bccb51f60d0fe4aac98fff736))
- not refresh user plan after create org ([9801c71](https://github.com/QQuik/quik_proximity_marketing/commit/9801c71c4915bf8e78b59419680658b604298f3b))
- only send mail if result success is true ([fcf91a0](https://github.com/QQuik/quik_proximity_marketing/commit/fcf91a076e4c62a1500e0df031e2d703c37dcc83))
- parcel err ([25d6d5b](https://github.com/QQuik/quik_proximity_marketing/commit/25d6d5b8e42fd9bddbfbccd17e31386afaa273ce))
- parcelvoy ([3da54cf](https://github.com/QQuik/quik_proximity_marketing/commit/3da54cfc5f5c203101c34b772f3267fbd384bde2))
- parcelvoy docs url ([0c73df9](https://github.com/QQuik/quik_proximity_marketing/commit/0c73df9a82beb71c5fd57b2e469f73e2c8e64353))
- parcelvoy tp blocked ([b0d6f19](https://github.com/QQuik/quik_proximity_marketing/commit/b0d6f194fad745ecf90252cab704126e7da313f1))
- performance issue on i18n ([30d6830](https://github.com/QQuik/quik_proximity_marketing/commit/30d683075e72ae32098c6ed47e3223d417d3a228))
- plan cache not clear when create org ([6fd6fb8](https://github.com/QQuik/quik_proximity_marketing/commit/6fd6fb8d980b7acc683b466c7ed87f84820387ce))
- plan check for create tp anon ([a5c37f0](https://github.com/QQuik/quik_proximity_marketing/commit/a5c37f005da0198b43ebb7184fd0df703994f605))
- profile service ([#390](https://github.com/QQuik/quik_proximity_marketing/issues/390)) ([8c4bcba](https://github.com/QQuik/quik_proximity_marketing/commit/8c4bcba273ea35c8c966696b70efc57d52327520))
- public files ([899e39b](https://github.com/QQuik/quik_proximity_marketing/commit/899e39b5c21e6a1e4606af2a9df21d899c7fe6f5))
- qr link ([d4ff6a9](https://github.com/QQuik/quik_proximity_marketing/commit/d4ff6a909535245a5cf981cce33a6a683637b8c9))
- qr spam update in tp update page ([326d38a](https://github.com/QQuik/quik_proximity_marketing/commit/326d38ae54b9534664e9e554bbec824317581fe6))
- qr-customize-in-app-load-wrong-options by remove hard code color ([#417](https://github.com/QQuik/quik_proximity_marketing/issues/417)) ([4f1c5a5](https://github.com/QQuik/quik_proximity_marketing/commit/4f1c5a58f305e4878ea8f8b3b653e0e32fd76e6b))
- querykey tag detail ([#457](https://github.com/QQuik/quik_proximity_marketing/issues/457)) ([3478fd2](https://github.com/QQuik/quik_proximity_marketing/commit/3478fd23ab77b5c7c832c69c67c0c7b6122ca3a5))
- reduce use effect qr render ([#427](https://github.com/QQuik/quik_proximity_marketing/issues/427)) ([ad7d397](https://github.com/QQuik/quik_proximity_marketing/commit/ad7d3976ddbb70d99fad6b345bdf2a7274b23e5c))
- referrer chart display and display top 5 most visit when hover ([a709115](https://github.com/QQuik/quik_proximity_marketing/commit/a7091151ab0902eed8585bf1bd22915b1a9c8fa5))
- refresh token error ([4284e2c](https://github.com/QQuik/quik_proximity_marketing/commit/4284e2ce41da3965a80ebc5fb131f7e8a39965ab))
- refresh token make duplicate cookie ([a7a8b65](https://github.com/QQuik/quik_proximity_marketing/commit/a7a8b653cbe06bd1c33f5c958ccb6be4417055a9))
- regex for block ip address ([7124105](https://github.com/QQuik/quik_proximity_marketing/commit/712410507a1a8ff77ee01676dfa3d870cac41ff8))
- regex for block ip address ([055bcfb](https://github.com/QQuik/quik_proximity_marketing/commit/055bcfbe0f70e2db7861c5cd80b9aee43726737f))
- remove bg for loading screen ([26e8b90](https://github.com/QQuik/quik_proximity_marketing/commit/26e8b90a8a0a39a13a399af153059c472adce2a6))
- remove code test ([89f97c5](https://github.com/QQuik/quik_proximity_marketing/commit/89f97c5a902a92884cd1b25880dfc4edec917240))
- remove eval for security ([#464](https://github.com/QQuik/quik_proximity_marketing/issues/464)) ([d450cd9](https://github.com/QQuik/quik_proximity_marketing/commit/d450cd91385600dc31e1e523c55a741b4a6a0153))
- remove old file ([80723e0](https://github.com/QQuik/quik_proximity_marketing/commit/80723e0bb159749a06acd89f010e3815d2753f0e))
- remove provider in others layout ([e1f5b56](https://github.com/QQuik/quik_proximity_marketing/commit/e1f5b56964ac83f6f8cbca62b9e9c24870c66b68))
- remove react context ([9748616](https://github.com/QQuik/quik_proximity_marketing/commit/9748616ea8956b1bee29ca89cbda6cfc5207ca17))
- remove test code ([d66d361](https://github.com/QQuik/quik_proximity_marketing/commit/d66d361725f40824ba412d79d2ce4025a66d56a2))
- remove webp on metatag image ([88f0a1e](https://github.com/QQuik/quik_proximity_marketing/commit/88f0a1e95a73911f786b65819def2d47c7063892))
- responsive in mobile devices ([b7ac32a](https://github.com/QQuik/quik_proximity_marketing/commit/b7ac32a105bb51b205cffc41117f1dc5cacf44be))
- revert limit ([914e537](https://github.com/QQuik/quik_proximity_marketing/commit/914e537d7dcf0dbba34207a5aa346a690e60a8fc))
- sameSite = None & log for cookie ([9f63085](https://github.com/QQuik/quik_proximity_marketing/commit/9f63085e079c118e5269e1a6fff81b67d19b239c))
- scroll for home page ([98c4336](https://github.com/QQuik/quik_proximity_marketing/commit/98c433601380418388c4c23e9a423bbc5a55dab0))
- show full QR customization form when QR code is dirty ([61ffd42](https://github.com/QQuik/quik_proximity_marketing/commit/61ffd42b26fcab5c6e9c79adf5759a88180c6d97))
- show login call2action when user not logged in ([24d3906](https://github.com/QQuik/quik_proximity_marketing/commit/24d3906096c5daea9a086a96b7011e7ddbd206e7))
- skip domain-based cookie deletion in development environment ([9ade6e7](https://github.com/QQuik/quik_proximity_marketing/commit/9ade6e78debe184cd070c712cccdb4ce7db7287b))
- suspense on acquisitions tab ([62df083](https://github.com/QQuik/quik_proximity_marketing/commit/62df08367024bc69cefd1d94304753afd30a6a35))
- tag errors ([603b7e5](https://github.com/QQuik/quik_proximity_marketing/commit/603b7e5ecd3f93ef0b42a12219677c2ca92939c4))
- tags error on macos ([403fab6](https://github.com/QQuik/quik_proximity_marketing/commit/403fab61462f8b230aa7dd373b7c186ac7f9c1a5))
- test deploy ([a5ed4d2](https://github.com/QQuik/quik_proximity_marketing/commit/a5ed4d28fe15be1e3e4af23b2611d5ee038bd490))
- tp form dirty handle ([783c14d](https://github.com/QQuik/quik_proximity_marketing/commit/783c14d2174a742cb9794d462cb2826aee381e84))
- tp logic ([83ae675](https://github.com/QQuik/quik_proximity_marketing/commit/83ae675795b6834b2fc21f93a3ce708dfd08882e))
- try to fix cookie ([ed8d035](https://github.com/QQuik/quik_proximity_marketing/commit/ed8d0354dbeac238620a1de943161451ddb93bee))
- try to fix i18n cookie not set on root domain ([c775589](https://github.com/QQuik/quik_proximity_marketing/commit/c775589ae550a5af61177dc71ff67efe4e700d49))
- ts err ([f41d7bf](https://github.com/QQuik/quik_proximity_marketing/commit/f41d7bfafc527c94d7e9b89088cee99f37ee3b62))
- ts error on blob type ([38c4a60](https://github.com/QQuik/quik_proximity_marketing/commit/38c4a60d085525a8e237330f3f9bb81ab10c05dd))
- type error ([4806593](https://github.com/QQuik/quik_proximity_marketing/commit/48065938e5ac63963d4d3fa529e06b7c54c0d0b6))
- typescript ([af8887b](https://github.com/QQuik/quik_proximity_marketing/commit/af8887b694f285e3ecc48a8d053594746ea4f4cf))
- typescript error ([abec86b](https://github.com/QQuik/quik_proximity_marketing/commit/abec86b8eb6d38108b7d92c4ed29f8de487b6d59))
- typescript error ([cd71385](https://github.com/QQuik/quik_proximity_marketing/commit/cd7138574cf68bb9f68493011f89f4fd4069c35b))
- typescript error on blob type ([deea737](https://github.com/QQuik/quik_proximity_marketing/commit/deea7374861286cf4433bcf4a1f568de34ea2026))
- typo error in shlink api path ([0c98397](https://github.com/QQuik/quik_proximity_marketing/commit/0c983970e0320de3e19fe01e35cf899d7125b019))
- ui freeze on popover ([e485e3e](https://github.com/QQuik/quik_proximity_marketing/commit/e485e3ecb57589a1b9c0f3090abe1c9d44b60371))
- ui responsive ([f8875ee](https://github.com/QQuik/quik_proximity_marketing/commit/f8875ee84734d466b8854e0a6c67b52ff09e9826))
- ui update for dashboard ([4f3498a](https://github.com/QQuik/quik_proximity_marketing/commit/4f3498a901156457b15cbd435f3fa788c1c607d0))
- update code ([fe8a881](https://github.com/QQuik/quik_proximity_marketing/commit/fe8a881ca27dfe08b9647b8c41b0e1d72f5bf25c))
- update content ([bb65f6a](https://github.com/QQuik/quik_proximity_marketing/commit/bb65f6a6af93d72bc21cf985c0970377cb695772))
- update db payment ([074e00b](https://github.com/QQuik/quik_proximity_marketing/commit/074e00bb14281198ccbf547e5165f046e6dcadc3))
- update dependabot config to use npm instead of yarn package ecosystem ([62bc715](https://github.com/QQuik/quik_proximity_marketing/commit/62bc715b3f2ea7034dba21e86d9e699a8df9f7c8))
- update Docker dependencies for node-canvas and add ts-ignore comments for type safety ([a93fe19](https://github.com/QQuik/quik_proximity_marketing/commit/a93fe1926648a428f30ea644eeffe9b5cb0af986))
- update Dockerfile to properly install node-canvas dependencies in base image ([8587468](https://github.com/QQuik/quik_proximity_marketing/commit/858746885afb35fec2006d3a5befa2703d4f5fb0))
- update env ([1212b82](https://github.com/QQuik/quik_proximity_marketing/commit/1212b82e6c7c77916675f42262ccc8229fd9e5c3))
- update mail queue ([4f2b81c](https://github.com/QQuik/quik_proximity_marketing/commit/4f2b81c1c2b900fdc5a1e2fa1bc7d1304ceeeaa7))
- update Next.js version and adjust dynamic import paths for i18n ([0c12eb2](https://github.com/QQuik/quik_proximity_marketing/commit/0c12eb2a3e193ccfd8865e542a6ce7d24f33ff56))
- update SameSite cookie attribute from None to Lax for auth tokens ([09edd47](https://github.com/QQuik/quik_proximity_marketing/commit/09edd4756335045ad09096c30f7ab60d887d9ae3))
- update short_url to use environment variable for base URL ([ac0dfe2](https://github.com/QQuik/quik_proximity_marketing/commit/ac0dfe220b3825d17775ff704069d39a53202eaf))
- update to using app error and check empty in advanced analytic ([#386](https://github.com/QQuik/quik_proximity_marketing/issues/386)) ([1dcf292](https://github.com/QQuik/quik_proximity_marketing/commit/1dcf2926f35abead1f14723d2a2ad7be203d825e))
- url for invitation when accept ([033e6b4](https://github.com/QQuik/quik_proximity_marketing/commit/033e6b4add88c50b6568b7971478883af0e91597))
- use full domain with shortcode instead of shortUrl for QR code generation ([24c8a9f](https://github.com/QQuik/quik_proximity_marketing/commit/24c8a9fe1360df32f4a2c7d3e5b0318ee7bddd94))
- use QR customization options from created touch point instead of default options ([bd816a2](https://github.com/QQuik/quik_proximity_marketing/commit/bd816a298a75493a567a4a0004f5d55e81a6d9da))
- using session to get user in update Profile and remove console… ([#389](https://github.com/QQuik/quik_proximity_marketing/issues/389)) ([e0b20c2](https://github.com/QQuik/quik_proximity_marketing/commit/e0b20c26da9438bdf6784b21462d7f002440c502))
- workflow ([e21d618](https://github.com/QQuik/quik_proximity_marketing/commit/e21d6180a98b5a4493efb0613aadd86108cff7b0))
- workflow to correct branch ([0eb8500](https://github.com/QQuik/quik_proximity_marketing/commit/0eb8500a88b4dd199dee68cb553207826b440a94))
- wrap ArrayBuffer in Uint8Array when creating Blob/File for QR code images ([cfccb09](https://github.com/QQuik/quik_proximity_marketing/commit/cfccb09cad9767c3b30947a23a4e5cd6c552d1b5))
- wrapped useCallback for window.location.href to prevent auto load in build stage ([ce9d44d](https://github.com/QQuik/quik_proximity_marketing/commit/ce9d44da6b4066eb3ab64d5d43b487067c8cc5e9))
- wrong logic when add tp into tag ([7af645f](https://github.com/QQuik/quik_proximity_marketing/commit/7af645f1eef7bab343e0d20fe85d98bd0b32d294))
- yarn build error ([52c7885](https://github.com/QQuik/quik_proximity_marketing/commit/52c78855ef687f61dd4db44afef79d0bda021b24))

### 🛠 Updates

- add api call for acquistion ([#361](https://github.com/QQuik/quik_proximity_marketing/issues/361)) ([91adbfc](https://github.com/QQuik/quik_proximity_marketing/commit/91adbfcbad43dc55de85ea3fa35a54c2350afcea))
- add copy btn in qr result ([e9ca6b0](https://github.com/QQuik/quik_proximity_marketing/commit/e9ca6b0889fc63d4a6f5541c889d3a515e64ac65))
- add dbtypes ([57021a9](https://github.com/QQuik/quik_proximity_marketing/commit/57021a91bfb3b1d5a12b6250148a82b8a62db556))
- Add invitation detail component with accept/decline functionality ([7e8f25e](https://github.com/QQuik/quik_proximity_marketing/commit/7e8f25eab94cb2c684331c6a77730ad75e94f07c))
- add link into tp name ([e015e9a](https://github.com/QQuik/quik_proximity_marketing/commit/e015e9a88f8ef84bd377f2ce5cff0a7af1e35944))
- add meta page name as fallback of title ([790a772](https://github.com/QQuik/quik_proximity_marketing/commit/790a7722af3e639b3f8eb1fc57538a70784388cd))
- add placeholder for referrer chart ([25374a3](https://github.com/QQuik/quik_proximity_marketing/commit/25374a3d112a710567849af85bb2f70a8a8bfd87))
- add plan limit check for max members and fix tag count validation timing ([7ab996e](https://github.com/QQuik/quik_proximity_marketing/commit/7ab996e2cb9fa63303f8495d066ba3667b546053))
- add processing time to logs ([24c35f1](https://github.com/QQuik/quik_proximity_marketing/commit/24c35f112b6d30950725737e342a6a22ad49c5b7))
- add skeleton when loading & modify campaign update logic ([b81e2f7](https://github.com/QQuik/quik_proximity_marketing/commit/b81e2f787c9c30d44b1bf217f7201e9cd02372d9))
- add some test case ([f133e7f](https://github.com/QQuik/quik_proximity_marketing/commit/f133e7f492b70028ddf9f5a1e9e4829873fcf5cb))
- add supabase url into images nextconfig ([2f0c511](https://github.com/QQuik/quik_proximity_marketing/commit/2f0c51151507d79e1be002d5dbca290ba495729f))
- add touch point component & logic ([ada9ada](https://github.com/QQuik/quik_proximity_marketing/commit/ada9ada035a99d966499d031bc92249239bd6158))
- adding asset selected to touch point ([84cb9ae](https://github.com/QQuik/quik_proximity_marketing/commit/84cb9ae94ab24da99e4a877e66225b116abba5f4))
- adding asset selected to touch point ([df5a4a3](https://github.com/QQuik/quik_proximity_marketing/commit/df5a4a35a97f664ebced7d266a28751f9e23c10a))
- adding asset selected to touch point ([632a244](https://github.com/QQuik/quik_proximity_marketing/commit/632a2444d16b4b6c1e143755a8e1a0aea205de59))
- adding feature export tp file ([#418](https://github.com/QQuik/quik_proximity_marketing/issues/418)) ([c8068df](https://github.com/QQuik/quik_proximity_marketing/commit/c8068df90ac147c53586b51b2e1677249b93a269))
- adding GA and Mautic Tracking ([9d9b156](https://github.com/QQuik/quik_proximity_marketing/commit/9d9b1568fb4dd17bf00ff99a1be41864e0b945bd))
- adding landing page ([8d6ce46](https://github.com/QQuik/quik_proximity_marketing/commit/8d6ce460537161b7a66a2da986d8a2e81682e479))
- adding loading button ([09ee871](https://github.com/QQuik/quik_proximity_marketing/commit/09ee8716b6e7ab9c571b3fd2e89975327c6891b8))
- adding null check for some maps and remove Empty section, change it to null instead for reduce misunderstanding, apply tabs for Audience ([#366](https://github.com/QQuik/quik_proximity_marketing/issues/366)) ([cb0bf5f](https://github.com/QQuik/quik_proximity_marketing/commit/cb0bf5f84dad03fb24e7733dc1eb319817d8f162))
- adding null check for tabs ([#368](https://github.com/QQuik/quik_proximity_marketing/issues/368)) ([d894cd2](https://github.com/QQuik/quik_proximity_marketing/commit/d894cd265a3b5d1a2cb20f81e00b39ba661e9147))
- Adding placholder for empty data chart ([#372](https://github.com/QQuik/quik_proximity_marketing/issues/372)) ([9834143](https://github.com/QQuik/quik_proximity_marketing/commit/983414350dd696c641e3d5d0e4613fdb56f92f3c))
- adding time expired at ([#262](https://github.com/QQuik/quik_proximity_marketing/issues/262)) ([d48f979](https://github.com/QQuik/quik_proximity_marketing/commit/d48f979cafdc387060426106c636b078c9d6ee0f))
- adding toggle langua + interaction slide ([a53c7e1](https://github.com/QQuik/quik_proximity_marketing/commit/a53c7e159aace125855d16420e889a2f60a6dd1d))
- adding zod translation ([#382](https://github.com/QQuik/quik_proximity_marketing/issues/382)) ([9d3caab](https://github.com/QQuik/quik_proximity_marketing/commit/9d3caabb43c12c82796f35a72fe9e1a58c34ccf8))
- adjust clean code" ([8541ebc](https://github.com/QQuik/quik_proximity_marketing/commit/8541ebc30790e13aac93d73e21b25b8978b02898))
- adjust clean code" ([34ded72](https://github.com/QQuik/quik_proximity_marketing/commit/34ded7273abce9e1968e6e695afde072233521e6))
- adjust to UI design v1.1 ([9589769](https://github.com/QQuik/quik_proximity_marketing/commit/9589769798676198f8482772864fd78db4ca105a))
- adjust ui ([8668039](https://github.com/QQuik/quik_proximity_marketing/commit/86680391bdf522e8423ba53f9f947c0286e1f4bb))
- adjust UI ([9ce227f](https://github.com/QQuik/quik_proximity_marketing/commit/9ce227fad97f691d8e34e01d35631c4cb8d40a8b))
- adjust UI ([bd995d2](https://github.com/QQuik/quik_proximity_marketing/commit/bd995d239778172869be39298a84d5f2042e015d))
- adjust using dangerous ([724fdc9](https://github.com/QQuik/quik_proximity_marketing/commit/724fdc95f68ddf828d60cde4bd038546179445a1))
- advanced analytic UI v0.1 ([#352](https://github.com/QQuik/quik_proximity_marketing/issues/352)) ([17d935f](https://github.com/QQuik/quik_proximity_marketing/commit/17d935f214f37653c025932630ec9446222428ea))
- advanced analytic UI v0.2 ([#353](https://github.com/QQuik/quik_proximity_marketing/issues/353)) ([687c942](https://github.com/QQuik/quik_proximity_marketing/commit/687c9421088fa9a0af7393b0db2b72369a96191e))
- ai slug UI v2.1 ([#412](https://github.com/QQuik/quik_proximity_marketing/issues/412)) ([aa2b1a7](https://github.com/QQuik/quik_proximity_marketing/commit/aa2b1a7642c805088b9c6d3322035afff9a7f165))
- ai UI slug with design ([#408](https://github.com/QQuik/quik_proximity_marketing/issues/408)) ([8f4a6ff](https://github.com/QQuik/quik_proximity_marketing/commit/8f4a6ff056cb72c491f9608f4b1a89586361d55c))
- analytic page ([aaf186a](https://github.com/QQuik/quik_proximity_marketing/commit/aaf186a7097e17a988456185d273888db1851aee))
- analytic page ([b661305](https://github.com/QQuik/quik_proximity_marketing/commit/b6613051819219370fdd4457376d297bde1d7874))
- animation landingpage ([3264136](https://github.com/QQuik/quik_proximity_marketing/commit/3264136765727fa4214ebb73d38d0edad75be19e))
- app sidebar v0.1 ([#425](https://github.com/QQuik/quik_proximity_marketing/issues/425)) ([6217700](https://github.com/QQuik/quik_proximity_marketing/commit/621770089b2af28a9018c807d01eab70e2f10094))
- arrow back and log out button ([#415](https://github.com/QQuik/quik_proximity_marketing/issues/415)) ([636b926](https://github.com/QQuik/quik_proximity_marketing/commit/636b92689e34c0c77a7321d3e281ae92a08f79f8))
- auto switch tab to qr code if generate by create qr code ([#463](https://github.com/QQuik/quik_proximity_marketing/issues/463)) ([e65bea3](https://github.com/QQuik/quik_proximity_marketing/commit/e65bea3aa8ad5e0794da64fed6dd57d0ed91d99c))
- change default options of qr to match with qr in landing page ([#413](https://github.com/QQuik/quik_proximity_marketing/issues/413)) ([519ca2b](https://github.com/QQuik/quik_proximity_marketing/commit/519ca2b885f0e6d28005a6b904fb6925ec0de7db))
- change default url ([#474](https://github.com/QQuik/quik_proximity_marketing/issues/474)) ([2cb735f](https://github.com/QQuik/quik_proximity_marketing/commit/2cb735f46f01adb61bcb02ba6fdbacf73adc52a7))
- change img and content layout ([00b6a68](https://github.com/QQuik/quik_proximity_marketing/commit/00b6a68bf72d297c0233d53ad743d2771b71f4f2))
- change li2con from png to svg ([#340](https://github.com/QQuik/quik_proximity_marketing/issues/340)) ([0349e3e](https://github.com/QQuik/quik_proximity_marketing/commit/0349e3ec84dcc40e268ee74d44f7493860830c2e))
- change logic of validate desination ([dbf3e00](https://github.com/QQuik/quik_proximity_marketing/commit/dbf3e006545fcdd541718b6be4006edf7ce6e04b))
- change password in profile tab ([7dbda80](https://github.com/QQuik/quik_proximity_marketing/commit/7dbda8073a57d8c2433a42521fe72184f6a01f30))
- change some component from client to server ([03e1f01](https://github.com/QQuik/quik_proximity_marketing/commit/03e1f0181d94e80f6b344f80ab4e9bf3351e468c))
- change text top performing and rename file ([#342](https://github.com/QQuik/quik_proximity_marketing/issues/342)) ([2a01c43](https://github.com/QQuik/quik_proximity_marketing/commit/2a01c4393bc010a80170f696c3110b1abde3d774))
- change to new casdoor server & move cert to .env ([a6d5ea6](https://github.com/QQuik/quik_proximity_marketing/commit/a6d5ea6a617902d4081aaf727fb0af45d5f160b6))
- change to popover for download qr ([ca0df39](https://github.com/QQuik/quik_proximity_marketing/commit/ca0df39409885b700ebb0c13d1d3fdb895f6f0c9))
- change toaster to sooner ([5107646](https://github.com/QQuik/quik_proximity_marketing/commit/51076461d4e32a0175664c76cae75ea6f021d819))
- cicd ([3453d4c](https://github.com/QQuik/quik_proximity_marketing/commit/3453d4c87a8debc140fc7b24913d7b5bd18676fc))
- cicd ([53a291a](https://github.com/QQuik/quik_proximity_marketing/commit/53a291aceae6ff45ae9196fdd776f33695073aa6))
- code syntax ([#465](https://github.com/QQuik/quik_proximity_marketing/issues/465)) ([80ab7ad](https://github.com/QQuik/quik_proximity_marketing/commit/80ab7ad4b1c330014df668da3e66d192eecdd637))
- column is_warranty to asset ([3172239](https://github.com/QQuik/quik_proximity_marketing/commit/3172239045284d9e8efccf2bea08639ee71e4df2))
- create tp with advance custom customize ([#454](https://github.com/QQuik/quik_proximity_marketing/issues/454)) ([f34dee4](https://github.com/QQuik/quik_proximity_marketing/commit/f34dee43ec5577e65aecd6a09b80bf13ccc3b34d))
- dashboard ([a46633d](https://github.com/QQuik/quik_proximity_marketing/commit/a46633d23e54cedf0ca3ba5c4bd712ba22efad5f))
- dashboard new UI ([#429](https://github.com/QQuik/quik_proximity_marketing/issues/429)) ([3fac90a](https://github.com/QQuik/quik_proximity_marketing/commit/3fac90a92fd1224c33cb36b41eab37afb28b79e1))
- database-types ([9383143](https://github.com/QQuik/quik_proximity_marketing/commit/938314341672c9e66bc6bede008ca98bc3bb72d1))
- db types ([5b0f6bc](https://github.com/QQuik/quik_proximity_marketing/commit/5b0f6bc46a9548a864a5271d35ed175e45f8e1b1))
- deploy .yml and encode .env ([b4aad40](https://github.com/QQuik/quik_proximity_marketing/commit/b4aad4021634fc39f15647ef625f9ca0099091ad))
- disable touchpoint edit when campaign is disabled ([e32bcb8](https://github.com/QQuik/quik_proximity_marketing/commit/e32bcb8f3e4b04c477e60742574aea58ab12046e))
- display one month selection for mobile calendar ([#341](https://github.com/QQuik/quik_proximity_marketing/issues/341)) ([ba22f30](https://github.com/QQuik/quik_proximity_marketing/commit/ba22f30d46cc0a9f1bf4831937c3f7f2f599454c))
- docker compose ([fa49500](https://github.com/QQuik/quik_proximity_marketing/commit/fa495006f900801017992fde63ea2f72cc07c7b4))
- dummy push ([4290a1c](https://github.com/QQuik/quik_proximity_marketing/commit/4290a1c0fdcbaecf559626daa2558b4b43311b68))
- encode env ([8939f0d](https://github.com/QQuik/quik_proximity_marketing/commit/8939f0d144c27424572e6084c1c7ee4e57a987fb))
- env ([e4e6e5d](https://github.com/QQuik/quik_proximity_marketing/commit/e4e6e5d4b3f4c9302d2f6d9fd5922f9ff3c18463))
- env ([29d2fa3](https://github.com/QQuik/quik_proximity_marketing/commit/29d2fa33c1bff95109dd0a56cbe3347c51d08b46))
- env and adjust UI ([096882a](https://github.com/QQuik/quik_proximity_marketing/commit/096882a307567439314fb144381a248a45b08e7e))
- filter for advanced analytic ([#393](https://github.com/QQuik/quik_proximity_marketing/issues/393)) ([7528be5](https://github.com/QQuik/quik_proximity_marketing/commit/7528be5fe9a026b1b4a51d654dff9a05f6198cc1))
- first name in contact form ([e88ad12](https://github.com/QQuik/quik_proximity_marketing/commit/e88ad1282a9123e7737abad74f6d213a4a0b1f9e))
- first name in contact form ([6ac61e5](https://github.com/QQuik/quik_proximity_marketing/commit/6ac61e5fa377d7789d9f573242b11e102259ce34))
- fix analytics page & add empty data section ([67729bb](https://github.com/QQuik/quik_proximity_marketing/commit/67729bb446011992f3b76d63031e25e3df7e7743))
- fix and create new tp v0.1 ([#453](https://github.com/QQuik/quik_proximity_marketing/issues/453)) ([54ec83f](https://github.com/QQuik/quik_proximity_marketing/commit/54ec83f19639735c3ae846574a738c0323139091))
- fix bug 30/6 about QR customize for better display ([ab6338c](https://github.com/QQuik/quik_proximity_marketing/commit/ab6338c1d940e792a23c91d5c5880de2cbb51ded))
- fix bugs based on error found ([a389762](https://github.com/QQuik/quik_proximity_marketing/commit/a389762dc80a068f880a95ab5d8e7273e821f4a3))
- fix cicd ([bfe6ca8](https://github.com/QQuik/quik_proximity_marketing/commit/bfe6ca84aa2576cbcc94597d47a808ace17cf78f))
- fix conflict ([d24dbf7](https://github.com/QQuik/quik_proximity_marketing/commit/d24dbf764e38731cf092c46ae786c454b2efee50))
- fix conflict ([358b2b7](https://github.com/QQuik/quik_proximity_marketing/commit/358b2b70273caed5c034c437509e5d57eaed29e1))
- fix conflict ([538c4be](https://github.com/QQuik/quik_proximity_marketing/commit/538c4beb30e6bfa9da6b41724e2dc7019a905614))
- fix conflict ([4348cc3](https://github.com/QQuik/quik_proximity_marketing/commit/4348cc3d2d94ae98f58963805c7cea14f08023e0))
- fix conflict ([27178d0](https://github.com/QQuik/quik_proximity_marketing/commit/27178d0dddd99476ae31181eaacc7fbbbe0905d6))
- fix conflict ([f328e69](https://github.com/QQuik/quik_proximity_marketing/commit/f328e699a0351511a2a83f2f40385892bd73be76))
- fix conflict ([0040321](https://github.com/QQuik/quik_proximity_marketing/commit/004032174ab136e83754ef90d7777c9b0a1f4386))
- fix conflict ([2ce83a2](https://github.com/QQuik/quik_proximity_marketing/commit/2ce83a2002e3250a3c099884494f97c6e577e07f))
- fix conflict ([62cdeac](https://github.com/QQuik/quik_proximity_marketing/commit/62cdeac6eacc06b574aba457133fad84d33d58fd))
- fix err ([c845612](https://github.com/QQuik/quik_proximity_marketing/commit/c8456129c7e40b4de7703bde892c91ce326b60d2))
- fix logic profile, adding switch to adjust status of assets and adding new column to supabase ([93d736c](https://github.com/QQuik/quik_proximity_marketing/commit/93d736cb15d80ad4153a07e6368a2f23d20426ba))
- fix logic profile, adding switch to adjust status of assets and adding new column to supabase ([#23](https://github.com/QQuik/quik_proximity_marketing/issues/23)) ([82870c7](https://github.com/QQuik/quik_proximity_marketing/commit/82870c71ffd8460ff30a3724613fabf5edaea7ea))
- fix login page ([5938fa7](https://github.com/QQuik/quik_proximity_marketing/commit/5938fa77cfae690711131fab13645ffc1867393e))
- fix offset of toaster ([3adc5dc](https://github.com/QQuik/quik_proximity_marketing/commit/3adc5dc6d1c1c4254ead71f7d27a9ba6ea0286fc))
- fix resize dowload qr ([0a03dbb](https://github.com/QQuik/quik_proximity_marketing/commit/0a03dbb8c768c1d1687c8ae6aef4540d399b19dd))
- fix resize dowload qr ([fe0e911](https://github.com/QQuik/quik_proximity_marketing/commit/fe0e9118ecc8481a665a54e360d219a4d63d87f7))
- fix resize dowload qr ([#207](https://github.com/QQuik/quik_proximity_marketing/issues/207)) ([19a1f82](https://github.com/QQuik/quik_proximity_marketing/commit/19a1f82e91baef25a5bed69ce88dccd44352ce5f))
- fix resize dowload qr ([#219](https://github.com/QQuik/quik_proximity_marketing/issues/219)) ([52ecf6b](https://github.com/QQuik/quik_proximity_marketing/commit/52ecf6b219d512b4bb40a24a2497f130e97954a1))
- fix table assets ([18cfa6b](https://github.com/QQuik/quik_proximity_marketing/commit/18cfa6b0b001c06e91384e02bcc3f9f5f0dc9d64))
- fix ui 13/5 ([2c93885](https://github.com/QQuik/quik_proximity_marketing/commit/2c9388578509f078b8494e9903433466fa3cc9b0))
- fix UI again ([2b9bbc2](https://github.com/QQuik/quik_proximity_marketing/commit/2b9bbc291f16ac3fbfc053a4bb7c1d65f9457f25))
- fix ui ver2 30/5 ([abf772e](https://github.com/QQuik/quik_proximity_marketing/commit/abf772ee19745c9723517800f6b74dc7bedde099))
- fix UI, navigation and i18n ([6146fc1](https://github.com/QQuik/quik_proximity_marketing/commit/6146fc1042e08fe99b06d67dbf77edcfe288234e))
- hidden countdown in premium plan and adjust content display ([#310](https://github.com/QQuik/quik_proximity_marketing/issues/310)) ([8ab9ebd](https://github.com/QQuik/quik_proximity_marketing/commit/8ab9ebddc7a1fc380a087aca9c7fee323638ab4c))
- hidden other filters ([1e83c05](https://github.com/QQuik/quik_proximity_marketing/commit/1e83c05dcda41187184562a87e66f8d86d4a36fa))
- hide apps select page ([6a9ca17](https://github.com/QQuik/quik_proximity_marketing/commit/6a9ca170ad49dcb3caab3cebba3e594aeec299ef))
- hide some field ([ddb0d92](https://github.com/QQuik/quik_proximity_marketing/commit/ddb0d9261175c85c756b4be8239259bc5222e06b))
- hide some module ([12b2ec3](https://github.com/QQuik/quik_proximity_marketing/commit/12b2ec3bd3ee632d8220ede6a79e85f6205790be))
- hotfix UI ([b3c5995](https://github.com/QQuik/quik_proximity_marketing/commit/b3c5995f3bc26121a391a8697125bc553728d391))
- import file validate data ([#406](https://github.com/QQuik/quik_proximity_marketing/issues/406)) ([1eab054](https://github.com/QQuik/quik_proximity_marketing/commit/1eab0542ca295b978e16b9393453288809bc64b0))
- improve ui ([3e46b36](https://github.com/QQuik/quik_proximity_marketing/commit/3e46b36922b7f1467892cfaf64756efcd8f4aa0e))
- improve UI dashboard & save qr image when insert/update tp ([#439](https://github.com/QQuik/quik_proximity_marketing/issues/439)) ([b366ca0](https://github.com/QQuik/quik_proximity_marketing/commit/b366ca072ffbda052b868e77c1a099c6e626919d))
- init ([4778ff1](https://github.com/QQuik/quik_proximity_marketing/commit/4778ff189a84e8dc69f74dde5988281a4aa11ef8))
- invite page ([b86e8f8](https://github.com/QQuik/quik_proximity_marketing/commit/b86e8f8494cc04c6b2f1dae524268b8edcd837b1))
- keep changes ([ee12d85](https://github.com/QQuik/quik_proximity_marketing/commit/ee12d854480fffb43d10fcc1e5e59a143f98b750))
- landing page ([9305782](https://github.com/QQuik/quik_proximity_marketing/commit/9305782903fef1cb3fe36e375bf4aeab5cd75cfd))
- list qr and shortlink ([#436](https://github.com/QQuik/quik_proximity_marketing/issues/436)) ([f9f80ba](https://github.com/QQuik/quik_proximity_marketing/commit/f9f80ba820b191c40faf8f693ba28ddefa7c0797))
- make redirect url of gg oAuth dynamic by window url ([ddb1e3a](https://github.com/QQuik/quik_proximity_marketing/commit/ddb1e3a59643dca618843467a60a2f60119c5eea))
- maps and fixing api error ([35c3f83](https://github.com/QQuik/quik_proximity_marketing/commit/35c3f831174c453e342f9f65d4f9a4d8ecab3123))
- missing code from cherry pick for linechart and heatmap ([#395](https://github.com/QQuik/quik_proximity_marketing/issues/395)) ([5cf5558](https://github.com/QQuik/quik_proximity_marketing/commit/5cf5558df5569df98752367cabb768cb536ae045))
- modified component fancy select ([9111253](https://github.com/QQuik/quik_proximity_marketing/commit/9111253b261ddd53c01871fcaa3e9e7d6dfe104c))
- modified dashboard unlock insight ([f2ae5f5](https://github.com/QQuik/quik_proximity_marketing/commit/f2ae5f5c9933ab305ee84f89cfeea20397a3e1cf))
- modified touch point details ([23f2820](https://github.com/QQuik/quik_proximity_marketing/commit/23f28203ac13e42bb84e1cc1ec4d7805d0bccd6a))
- modified UI and adjust contact form ([856e5ef](https://github.com/QQuik/quik_proximity_marketing/commit/856e5ef275711f567baa126822d4c0cf8d03aba8))
- modified UI for org settings ([afd1fec](https://github.com/QQuik/quik_proximity_marketing/commit/afd1fecf8fa4c285ca4924195f3ce6256a6a4fe3))
- modified UI v1.2 ([f2c4b9f](https://github.com/QQuik/quik_proximity_marketing/commit/f2c4b9f52ea791b1ff81cd4232da554dcf2aad12))
- modified v1.3 ([decd8d0](https://github.com/QQuik/quik_proximity_marketing/commit/decd8d0ef14695d5530f0f411664734a60df3e96))
- modify calendar & dockerfile ([0144c2a](https://github.com/QQuik/quik_proximity_marketing/commit/0144c2aed7581427efbd24bf4e6c3b414d79dce5))
- modify dashboard and analytic for matching design ([fa242f3](https://github.com/QQuik/quik_proximity_marketing/commit/fa242f322c2c17025977ed85c5fbeb8566e6cd0f))
- modify host ([edef7a6](https://github.com/QQuik/quik_proximity_marketing/commit/edef7a6eac089715f7c6f10e239bfffca95b17ab))
- modify logic & add some components ([5ec3444](https://github.com/QQuik/quik_proximity_marketing/commit/5ec3444ab1e374a2f66b15d9bf792605c78dd232))
- move analytic to dashboard ([409f35e](https://github.com/QQuik/quik_proximity_marketing/commit/409f35e7b502ad6bc4727b13bface56620c80981))
- move change to outside and fix UI ([d3ff55d](https://github.com/QQuik/quik_proximity_marketing/commit/d3ff55df6bbffd5f295013550d0eb232f8cfcb09))
- move change to outside and fix UI ([eabe667](https://github.com/QQuik/quik_proximity_marketing/commit/eabe66787c78d275d4c3ddd78a2ca4536c0378d6))
- move dev from release into pre-release ([0f7415f](https://github.com/QQuik/quik_proximity_marketing/commit/0f7415f9fb08f5ac57bdf13618776d21326c73e2))
- new .env.enc ([e534106](https://github.com/QQuik/quik_proximity_marketing/commit/e534106be9f0f83d61b7bdcf1e19dafdc5542423))
- new env for dev ([0cc5a3c](https://github.com/QQuik/quik_proximity_marketing/commit/0cc5a3c01c0076559015778105ef2fafc514e279))
- profile management ([f428a5b](https://github.com/QQuik/quik_proximity_marketing/commit/f428a5b050e359b43bc053fa7f987ec5047717c2))
- qr options client ([#445](https://github.com/QQuik/quik_proximity_marketing/issues/445)) ([1b5d23a](https://github.com/QQuik/quik_proximity_marketing/commit/1b5d23a8ebf9afaf8919eedfdc61a746bdeb5c1d))
- querykey for tag detail and max character display for name tp… ([#456](https://github.com/QQuik/quik_proximity_marketing/issues/456)) ([9349668](https://github.com/QQuik/quik_proximity_marketing/commit/934966816a16e3a6ad7b37c2b3d6c911451b2a3b))
- Readme ([0a0a617](https://github.com/QQuik/quik_proximity_marketing/commit/0a0a6178dfaa18adbee663af1ac814141e0bbd62))
- recover adding type t=1 ([e020921](https://github.com/QQuik/quik_proximity_marketing/commit/e0209216e01b763779876016080bc4c2d99670e0))
- redirect when going to home page ([91b10a7](https://github.com/QQuik/quik_proximity_marketing/commit/91b10a7af2fe73f92cbc4af2aeed7b553ff7737f))
- Remove authInterrupts config from next.config.mjs ([0bc574c](https://github.com/QQuik/quik_proximity_marketing/commit/0bc574cd8fb8cd325ba62c5dad798cf26c4f8496))
- remove isCreate for form ([0f61570](https://github.com/QQuik/quik_proximity_marketing/commit/0f615705a71ae529bb099413281282d67820d804))
- remove package next server ([#462](https://github.com/QQuik/quik_proximity_marketing/issues/462)) ([4b30473](https://github.com/QQuik/quik_proximity_marketing/commit/4b304735f8178f18e5905879ac4e4d95deef1167))
- remove some old files ([ceb8614](https://github.com/QQuik/quik_proximity_marketing/commit/ceb861400f654851ee9ac741b7853d17abbf5348))
- remove unneccsary console.log ([250278c](https://github.com/QQuik/quik_proximity_marketing/commit/250278ca78bbf4699b8ce8d1220048a434559102))
- remove unused import and add maw-width for right image in meta tags ([#337](https://github.com/QQuik/quik_proximity_marketing/issues/337)) ([a8d684c](https://github.com/QQuik/quik_proximity_marketing/commit/a8d684ce0f34865acdab03250b298702eba466fe))
- setting aside profile ([02bf644](https://github.com/QQuik/quik_proximity_marketing/commit/02bf644d70857ac15a657034996a058d78cc477f))
- setting section ([175f1a9](https://github.com/QQuik/quik_proximity_marketing/commit/175f1a966cc711508efac8f7707d25d68c61c985))
- setup AI Optimize Slug UI version 1.0, still missing AI Recom… ([#396](https://github.com/QQuik/quik_proximity_marketing/issues/396)) ([a995765](https://github.com/QQuik/quik_proximity_marketing/commit/a995765bd4662ae2a762a600bfe029ecb09dfa1e))
- show updated at in dashboard ([d71a6a7](https://github.com/QQuik/quik_proximity_marketing/commit/d71a6a7be9b72a02aa974f36030ad974afb9e2c3))
- sidebar UI update ([35635c3](https://github.com/QQuik/quik_proximity_marketing/commit/35635c320d40fdf07d30b009f262c01fe3192c31))
- slug generation prompt ([#405](https://github.com/QQuik/quik_proximity_marketing/issues/405)) ([023c55b](https://github.com/QQuik/quik_proximity_marketing/commit/023c55b3f40812beda8cde054d6a71affd07ab7e))
- still not create asset and activate NFC ([bcdc823](https://github.com/QQuik/quik_proximity_marketing/commit/bcdc823d6bf07f2750178260e86ebb3dc9be18ee))
- test cicd ([1a95e82](https://github.com/QQuik/quik_proximity_marketing/commit/1a95e8226f15ad18c53a367659517eaf2d9fd838))
- test cicd ([ce331be](https://github.com/QQuik/quik_proximity_marketing/commit/ce331bef6229949d6b38ea577b22287c389613a2))
- test cicd ([f88f177](https://github.com/QQuik/quik_proximity_marketing/commit/f88f177fb370aca1088136e002f940f0136424e6))
- text remove download shortlink list ([#444](https://github.com/QQuik/quik_proximity_marketing/issues/444)) ([1a0ab8f](https://github.com/QQuik/quik_proximity_marketing/commit/1a0ab8f2755a12ff9906f7000471777a32b9cc9f))
- title for form contact ([de343e3](https://github.com/QQuik/quik_proximity_marketing/commit/de343e318b0dbd41fb79ef7b53a0c25a2ca2d3c3))
- toast error when upload qr logo ([f957c80](https://github.com/QQuik/quik_proximity_marketing/commit/f957c800192e56cf45f4c79275ab00413e48b6d3))
- tooltip hover ([bfd889a](https://github.com/QQuik/quik_proximity_marketing/commit/bfd889a9238c6becffeb367771daea3b3369a74f))
- tooltip hover ([2976adc](https://github.com/QQuik/quik_proximity_marketing/commit/2976adcca20c048ea5888c29a84e77cd7211b029))
- tracking zalo OA and reset form after submit ([12d78a6](https://github.com/QQuik/quik_proximity_marketing/commit/12d78a69f32a3654d249c74bbb3f76b1726c61a6))
- translation and tag badges ([#448](https://github.com/QQuik/quik_proximity_marketing/issues/448)) ([494d7f1](https://github.com/QQuik/quik_proximity_marketing/commit/494d7f1ff5dfb1054c55baed56509cc0564a948a))
- translation files ([#381](https://github.com/QQuik/quik_proximity_marketing/issues/381)) ([6c6c91b](https://github.com/QQuik/quik_proximity_marketing/commit/6c6c91b2f885358de46de17735c1dcecaf27f5ff))
- ui change padding & slug schema ([#455](https://github.com/QQuik/quik_proximity_marketing/issues/455)) ([7b9963b](https://github.com/QQuik/quik_proximity_marketing/commit/7b9963bcdee37611cb5618f6e8498d85ff7e4789))
- ui for table assets ([9222f1c](https://github.com/QQuik/quik_proximity_marketing/commit/9222f1c02b410ce286e2e1de712fc83e3216b933))
- uncomment tab members ([7d4fff2](https://github.com/QQuik/quik_proximity_marketing/commit/7d4fff2e4e4381181986bee2b1be57f802c256d2))
- update cicd ([3641014](https://github.com/QQuik/quik_proximity_marketing/commit/364101409bb7e9e15dba49514d3f37cf3186ed0f))
- update cicd ([cbc9979](https://github.com/QQuik/quik_proximity_marketing/commit/cbc99790238726959cf033ff272b97b433792959))
- update cicd ([3108270](https://github.com/QQuik/quik_proximity_marketing/commit/31082701d73d38d4769ee73e15309d4e4c2b1388))
- update cicd ([61a6071](https://github.com/QQuik/quik_proximity_marketing/commit/61a60712db5216d7def9fde898245bae258aec02))
- update cicd ([6ff7731](https://github.com/QQuik/quik_proximity_marketing/commit/6ff77315eead05f7d2d42be2e7472b0ac96e9eec))
- update cicd ([3e1d80b](https://github.com/QQuik/quik_proximity_marketing/commit/3e1d80b84775214a110e8fcf47d6051e0dc96d9b))
- update cicd ([cc546bc](https://github.com/QQuik/quik_proximity_marketing/commit/cc546bc07689c006730a364e9797d6236f2b1dba))
- update cicd ([1c92e04](https://github.com/QQuik/quik_proximity_marketing/commit/1c92e04712850ec6ff01fee4445a71f61db7fe6a))
- update docker compose ([1e243a2](https://github.com/QQuik/quik_proximity_marketing/commit/1e243a2d8f1ef453c0933e9269dd01ad3bb63d09))
- update docker compose ([2cf88ca](https://github.com/QQuik/quik_proximity_marketing/commit/2cf88ca35f7f28d8cfbb76d2be9a6835193b6c43))
- update docker compose ([a1d54f3](https://github.com/QQuik/quik_proximity_marketing/commit/a1d54f31aaa4f777a9ee2317b246d96bf601aa41))
- update sidebar & navbar & some blank pages ([487eed1](https://github.com/QQuik/quik_proximity_marketing/commit/487eed10fce10882d6b7ee336d756f060daf6551))
- update skeleton for lazy load components ([dec8173](https://github.com/QQuik/quik_proximity_marketing/commit/dec817393885afe3d1628f38d9580f4ee5df8b01))
- update url of parcelvoy ([3003c02](https://github.com/QQuik/quik_proximity_marketing/commit/3003c023e4d49bc2a6b073d15365bbc2134cfe34))
- upgrade chart version ([57eaa2d](https://github.com/QQuik/quik_proximity_marketing/commit/57eaa2d17bae3fdcca8b3b55c7c2969bd52d39c7))
- using iconLeft instead of using children ([#458](https://github.com/QQuik/quik_proximity_marketing/issues/458)) ([e18def7](https://github.com/QQuik/quik_proximity_marketing/commit/e18def7263b9f9eb88488703d82d792eb2777d8d))
- using libary @next/third-parties for tracking GA" ([c5c6394](https://github.com/QQuik/quik_proximity_marketing/commit/c5c6394fa7f109e8741bd5e51644be76e717838b))
- v0.1 dashboard + analytic page ([7c2e6f4](https://github.com/QQuik/quik_proximity_marketing/commit/7c2e6f4cd8d6f5710db388bf7859e0c6add0cd72))
- version 1.0 for qr customize ([fef353f](https://github.com/QQuik/quik_proximity_marketing/commit/fef353f76ff0e1a0651393e114f71d81a45ceafb))
- watermarkbutton to accept children ([81ff136](https://github.com/QQuik/quik_proximity_marketing/commit/81ff1369834f5ae6a49c42d888da7183717da740))

### ♻️ Code Refactoring

- auth flow & middleware, remove casdoor client ([e25c325](https://github.com/QQuik/quik_proximity_marketing/commit/e25c325a6291aa1faa1dd1daff2e191649817372))
- components into features ([#362](https://github.com/QQuik/quik_proximity_marketing/issues/362)) ([17b5798](https://github.com/QQuik/quik_proximity_marketing/commit/17b57986fac8a48228e2e226af98e8eb5252c695))
- implement CORS middleware with enhanced security and caching headers ([9ffa50f](https://github.com/QQuik/quik_proximity_marketing/commit/9ffa50f0c652e6236ccff2174e5f17d2df674b1e))
- improve error handling and type safety in premium grant callback ([f86c134](https://github.com/QQuik/quik_proximity_marketing/commit/f86c1341f7aa184b0e1ce4ca94209189c47f44b4))
- improve file upload validation and error handling for CSV imports ([#409](https://github.com/QQuik/quik_proximity_marketing/issues/409)) ([692f058](https://github.com/QQuik/quik_proximity_marketing/commit/692f05829fd2d54481053ead07ee7a0182f3cff3))
- migrate from CampaignContentType to TouchPointContentType enum ([c89f26b](https://github.com/QQuik/quik_proximity_marketing/commit/c89f26b639a1e775aa8b12cb6618d19db70c2031))
- move assets into more structural place ([#347](https://github.com/QQuik/quik_proximity_marketing/issues/347)) ([2c3fac3](https://github.com/QQuik/quik_proximity_marketing/commit/2c3fac34e6703c1268d40784eaf90c3f7d547274))
- move logic tp delete & tp create into core ([fbeb3f7](https://github.com/QQuik/quik_proximity_marketing/commit/fbeb3f79fa165687f60df9787400f0c597698e88))
- move server utils and default meta tags to separate files ([5275182](https://github.com/QQuik/quik_proximity_marketing/commit/5275182a27337e80c1701cf29fa6edb5954b7bc9))
- move some data from provider to server component for clear loading state on view ([25f8f71](https://github.com/QQuik/quik_proximity_marketing/commit/25f8f71ffab3851bbc9c5a6b3a032e3ef4b75132))
- project structure ([#343](https://github.com/QQuik/quik_proximity_marketing/issues/343)) ([d4d601d](https://github.com/QQuik/quik_proximity_marketing/commit/d4d601dd5dfaafae57c3dfb4805d755ff99aaf47))
- remove loading state and spinner from QR code rendering component ([e1be078](https://github.com/QQuik/quik_proximity_marketing/commit/e1be0781ce233128097a50adb4f088a4e6c510d8))
- reorganize Dockerfile layers and enhance button component with icon positioning support ([e85b063](https://github.com/QQuik/quik_proximity_marketing/commit/e85b063cbcf2a8e63f22e64614e51ccd9068cb9f))
- repo service profile userplan ([#349](https://github.com/QQuik/quik_proximity_marketing/issues/349)) ([6b49180](https://github.com/QQuik/quik_proximity_marketing/commit/6b491805a020ca40a65d01293fed9aca0564c9e7))
- restructure codebase based features ([#363](https://github.com/QQuik/quik_proximity_marketing/issues/363)) ([849cbc0](https://github.com/QQuik/quik_proximity_marketing/commit/849cbc06703e9d633714ca519893e5bd21261dad))
- simplify touch point creation and update Redis password handling ([64544db](https://github.com/QQuik/quik_proximity_marketing/commit/64544db5beed8df67baa00a03dea7dda707ea7a3))
- touch point create api ([108549d](https://github.com/QQuik/quik_proximity_marketing/commit/108549dd01ad3ae14f88fb04085a1b703e0a05b8))
- touch point module into core ([#350](https://github.com/QQuik/quik_proximity_marketing/issues/350)) ([aaed4a0](https://github.com/QQuik/quik_proximity_marketing/commit/aaed4a01aa91ed0b4d470c1e18aca6c190835267))
- upgrade tailwind to v4 ([#473](https://github.com/QQuik/quik_proximity_marketing/issues/473)) ([6ee8dab](https://github.com/QQuik/quik_proximity_marketing/commit/6ee8dab91513df98f3708d13d11c0aaf7f10a8d0))
- use provided message as default error message instead of hardcoded strings ([e8188ac](https://github.com/QQuik/quik_proximity_marketing/commit/e8188acbfea5594734244217045099b3cce2b98e))

### Chore

- ... ([28bbd65](https://github.com/QQuik/quik_proximity_marketing/commit/28bbd654707253ab90bb3d1f1e64ba766a32cd3b))
- add dependabot configuration for daily yarn package updates ([c958da8](https://github.com/QQuik/quik_proximity_marketing/commit/c958da8ce0b0daae049d9de5c4b597648efd5e8d))
- add dev dependencies in build stage ([1a6734d](https://github.com/QQuik/quik_proximity_marketing/commit/1a6734d7b94194d9a396e57ecee4ebfdad991c18))
- add docs to exclude typescript ([3e9bd0c](https://github.com/QQuik/quik_proximity_marketing/commit/3e9bd0c80a4ca0e717e67344d6a1cd564fbe33af))
- add encrypted development environment variables ([2bbf745](https://github.com/QQuik/quik_proximity_marketing/commit/2bbf7450d096cdb9f590a322de4f1724e9cdad2a))
- add env ([929b0a0](https://github.com/QQuik/quik_proximity_marketing/commit/929b0a0352f54f25564a3a2bc30e7703751534b4))
- add log for debug ([76a3adc](https://github.com/QQuik/quik_proximity_marketing/commit/76a3adc9d7bfc4d86189f247cbd592d611b5ba01))
- add log for debug ([e27934d](https://github.com/QQuik/quik_proximity_marketing/commit/e27934dee40cc1676409176d848b3682ed5810a3))
- add log into dashboard route ([a537cd4](https://github.com/QQuik/quik_proximity_marketing/commit/a537cd4960d0551b6884a7571e2ca934807d0c34))
- add log into dashboard route ([719585b](https://github.com/QQuik/quik_proximity_marketing/commit/719585b6220eeabf8aecd479a3d51eefa614a516))
- add log into dashboard route ([94d3466](https://github.com/QQuik/quik_proximity_marketing/commit/94d3466b3b1d4b02b0c9f32232c839fad732584f))
- add log into refresh token for debug ([fb4b22d](https://github.com/QQuik/quik_proximity_marketing/commit/fb4b22d353fe76156ba250d4921b083f827e566e))
- add logs ([f6e43a4](https://github.com/QQuik/quik_proximity_marketing/commit/f6e43a482a2972ffe66c09835204ebe1fbb090ac))
- add new env enc file ([4c6b818](https://github.com/QQuik/quik_proximity_marketing/commit/4c6b8182dc9d41a3a0f81bf283a104ee8d1777ce))
- add params after login ([6034916](https://github.com/QQuik/quik_proximity_marketing/commit/60349161511fa570257c531fccf5e6d33a89ae71))
- add prettier config file ([7ba349b](https://github.com/QQuik/quik_proximity_marketing/commit/7ba349b3b4648e9b217f675f5ffc069cf411ee93))
- add sourcemap to debug ([65434f9](https://github.com/QQuik/quik_proximity_marketing/commit/65434f9a9e1be50a8cb0e1424dde13f2c73c23fb))
- add sudo pwd to command ([5638c9e](https://github.com/QQuik/quik_proximity_marketing/commit/5638c9edb15ca261ec6cd97230a93731ea017a08))
- adding animation bounce update qr realtime interactions tabs double re render qr safari ([#420](https://github.com/QQuik/quik_proximity_marketing/issues/420)) ([6f26dc8](https://github.com/QQuik/quik_proximity_marketing/commit/6f26dc89c3407e7114beac969222a527739ba28e))
- adding redis event key push file ([#423](https://github.com/QQuik/quik_proximity_marketing/issues/423)) ([f571ae1](https://github.com/QQuik/quik_proximity_marketing/commit/f571ae19b12b49b55ef447f8e237346d80d64584))
- change some text ([411efa3](https://github.com/QQuik/quik_proximity_marketing/commit/411efa3db5a096299946274d04d4a612fbfa6c12))
- change text ([ab14972](https://github.com/QQuik/quik_proximity_marketing/commit/ab1497204f2bc6d1f1dfe996e8ac2ec121a938ba))
- change text Analytic By Tag -> Basic Analytics ([b5b3ff3](https://github.com/QQuik/quik_proximity_marketing/commit/b5b3ff386282152fb7e982668358aacb76a656a9))
- **cicd:** add action to gemini review ([7b66448](https://github.com/QQuik/quik_proximity_marketing/commit/7b664488b3a75ebf8d0a980ecd9704e4d00e6b32))
- **cicd:** add action to gemini review ([22c780a](https://github.com/QQuik/quik_proximity_marketing/commit/22c780adbe6f54717ed234ecced04e7810b551c4))
- **cicd:** add sonar for workflow ([#459](https://github.com/QQuik/quik_proximity_marketing/issues/459)) ([d228fc3](https://github.com/QQuik/quik_proximity_marketing/commit/d228fc39d8aad3212748c85977183fee570efc1d))
- **cicd:** change workflow ([b0faaf6](https://github.com/QQuik/quik_proximity_marketing/commit/b0faaf6b427f28ceebfa878fc5ab0c6625f04e16))
- **cicd:** put sonar to PR only ([0812e79](https://github.com/QQuik/quik_proximity_marketing/commit/0812e796cf3cc35870a8969d647bfe0dc0dfc2c6))
- **cicd:** remove gemini review ([de6936d](https://github.com/QQuik/quik_proximity_marketing/commit/de6936d0d384f900f430ded7ddf215280b3d1620))
- **cicd:** update gemini model for review PR ([7b378d7](https://github.com/QQuik/quik_proximity_marketing/commit/7b378d734c174bc4405777924f55c30adf74a467))
- **cicd:** update gemini model for review PR ([d7e40e0](https://github.com/QQuik/quik_proximity_marketing/commit/d7e40e05a8e445134ea9c9a7b83c17932f077c49))
- disable auto meta tag generation for touch points ([cd6925d](https://github.com/QQuik/quik_proximity_marketing/commit/cd6925dc5731f1f6f6b1a000f5f28f202f51705d))
- disable auto meta tag generation for touch points ([7f46915](https://github.com/QQuik/quik_proximity_marketing/commit/7f4691515bc16b06f7b9420cda79052d7fa952fe))
- disable auto meta tags functionality in touch point service ([012693f](https://github.com/QQuik/quik_proximity_marketing/commit/012693f45aa086929ea62ab9fa3193ffc3920fd9))
- disable gen ai slug button and update translation file for ai … ([#421](https://github.com/QQuik/quik_proximity_marketing/issues/421)) ([a79df44](https://github.com/QQuik/quik_proximity_marketing/commit/a79df44f5958fa6a2668ac0acc440b5e975349b3))
- disable semantic release ([64b0a6a](https://github.com/QQuik/quik_proximity_marketing/commit/64b0a6a3997b7164c793df042f6d7512f0b6e6b8))
- disable this on development ([bce43a1](https://github.com/QQuik/quik_proximity_marketing/commit/bce43a1d8491b2d84e1fb202eef8b455ddae5888))
- downgrade typescript to major version 5 ([c299a04](https://github.com/QQuik/quik_proximity_marketing/commit/c299a04506b67cd06c66d983a895561c3d9b1afb))
- dummy push ([22a84c7](https://github.com/QQuik/quik_proximity_marketing/commit/22a84c7e6d2ce11a8dc3d92c588bc3ec583a849d))
- dummy push ([e0cf4a1](https://github.com/QQuik/quik_proximity_marketing/commit/e0cf4a180b72c163f25c39a40a565eb00a777770))
- dummy push ([1b39b30](https://github.com/QQuik/quik_proximity_marketing/commit/1b39b30533a71f4c4a8eb009a3ff040b127e06a1))
- dummy push ([8f08cea](https://github.com/QQuik/quik_proximity_marketing/commit/8f08cead9c6363706ed0ace1d8bba407e62e302b))
- dummy push ([37cfc78](https://github.com/QQuik/quik_proximity_marketing/commit/37cfc787fca640ee05e14b9e3ecd580713eabb4e))
- dummy push ([ff2efc7](https://github.com/QQuik/quik_proximity_marketing/commit/ff2efc7d8f1d7aa0de3a0145c843994f81b6dd04))
- dummy push ([7b3c4b4](https://github.com/QQuik/quik_proximity_marketing/commit/7b3c4b4c4ef4ff67cae5697a344f1c4faf92f92a))
- dummy push ([6b68f1e](https://github.com/QQuik/quik_proximity_marketing/commit/6b68f1e59dcefa7f1f61f576d34f9ea13c92daef))
- dummy push ([9b298d7](https://github.com/QQuik/quik_proximity_marketing/commit/9b298d726153ae780f8e75d956e4fa94a6269eb0))
- dummy push ([d936389](https://github.com/QQuik/quik_proximity_marketing/commit/d9363890dff0fd6eee475ff159c86680f535a9e2))
- dummy push ([cd61ea8](https://github.com/QQuik/quik_proximity_marketing/commit/cd61ea8c369adbbeb580b316c1dfa15656d51ae0))
- dummy push ([5731813](https://github.com/QQuik/quik_proximity_marketing/commit/5731813b09445a1cbfc84af331acbcc36121201e))
- dummy push ([fcde125](https://github.com/QQuik/quik_proximity_marketing/commit/fcde125a2c7a3a13e8a151ef7319787fe232be67))
- dummy push ([a9e2bfd](https://github.com/QQuik/quik_proximity_marketing/commit/a9e2bfd1650e3b052760e3c6f4491e42d88e5ed0))
- dummy push ([64fd2af](https://github.com/QQuik/quik_proximity_marketing/commit/64fd2afa8bb1814ba54ada754350044a25429d15))
- dummy push ([fdd8b44](https://github.com/QQuik/quik_proximity_marketing/commit/fdd8b4470d3f2a760f1a82d0f5a30eb267750402))
- exclude yarn.lock from review ([3a21e86](https://github.com/QQuik/quik_proximity_marketing/commit/3a21e869b86d065287a8eccf87a56e23dafc35e7))
- exclude yarn.lock from review ([ebbd182](https://github.com/QQuik/quik_proximity_marketing/commit/ebbd182a1cc9b013122c9e40bdde3f29fdff5543))
- fix ([2f78ee2](https://github.com/QQuik/quik_proximity_marketing/commit/2f78ee276d69c741ab1759c48a15b973a6e5c7cd))
- fix cicd ([d10281a](https://github.com/QQuik/quik_proximity_marketing/commit/d10281a9274a6d0aa74fcf35e5f076a9f43157d1))
- fix cicd ([651bbf8](https://github.com/QQuik/quik_proximity_marketing/commit/651bbf8b07998f1e8a8e6bf44e9034bbb1494b29))
- fix cicd ([fca0d4c](https://github.com/QQuik/quik_proximity_marketing/commit/fca0d4c85bf0f6992a93513fff9ba6c9ba403064))
- fix env ([2182e03](https://github.com/QQuik/quik_proximity_marketing/commit/2182e0379f886f04d2f576ecdff70376ea049868))
- fix file error ([dac8244](https://github.com/QQuik/quik_proximity_marketing/commit/dac82447e3361b32e755b5d410e650ed37ac2ba5))
- fix i18n cookie ([8b4627a](https://github.com/QQuik/quik_proximity_marketing/commit/8b4627a2781ab18e49c263ee6742e6ac39e65544))
- fix next build error ([7b1f3ae](https://github.com/QQuik/quik_proximity_marketing/commit/7b1f3aeed9962a77000e491e4ab03585a8100473))
- fix placeholder for search & add input ([b2157aa](https://github.com/QQuik/quik_proximity_marketing/commit/b2157aa2af1c5f336be8e143cf74105c4d75996e))
- fix text analytic visitors -> total ([32da4c6](https://github.com/QQuik/quik_proximity_marketing/commit/32da4c6af9bede8dfa4d4bfb3c5f6e9aa82318bd))
- fix workflow ([5379dc0](https://github.com/QQuik/quik_proximity_marketing/commit/5379dc0b936efc747aba14df8f6700d916fc271e))
- fixxxxxxxxxx ([211b84b](https://github.com/QQuik/quik_proximity_marketing/commit/211b84b7b4c242dc5e033bf0ab03982c6ec0281b))
- fixxxxxxxxxxx (final) ([2385e4c](https://github.com/QQuik/quik_proximity_marketing/commit/2385e4ce6ab3834980a4324f9d306fda1b67a8a5))
- init project structure ([9c09951](https://github.com/QQuik/quik_proximity_marketing/commit/9c09951e0828a2f93ffff0234d77ae9b95ac8c82))
- just release on main ([b694a32](https://github.com/QQuik/quik_proximity_marketing/commit/b694a323ac1395b3340802018fe2a6018b28b737))
- modify workflow ([90e1d49](https://github.com/QQuik/quik_proximity_marketing/commit/90e1d49c0bd965353f8edd0aeb7daba1700fede3))
- modify workflow ([d610d5a](https://github.com/QQuik/quik_proximity_marketing/commit/d610d5a574ddefc18365391a02af9e8c4448aaf1))
- omg, i forgot to add .env to gitignore and remove it ([9c6a120](https://github.com/QQuik/quik_proximity_marketing/commit/9c6a1207708f9c28527176c8450fc20fe80115e6))
- re-enable auto release ([14ce758](https://github.com/QQuik/quik_proximity_marketing/commit/14ce758c3f40a6948dd736d3d8593e12be008f64))
- re-trigger actions ([2396dff](https://github.com/QQuik/quik_proximity_marketing/commit/2396dff444084b51cdccac805a144f0193ec4bd0))
- **release:** 1.0.0 [skip ci] ([aacdd84](https://github.com/QQuik/quik_proximity_marketing/commit/aacdd84c074c36de3d9eea255781db418d2716ca))
- **release:** 1.0.0 [skip ci] ([989e81f](https://github.com/QQuik/quik_proximity_marketing/commit/989e81f569f7a566fba0990ed3742d0b747130f4))
- **release:** 1.0.1 [skip ci] ([b6a67bf](https://github.com/QQuik/quik_proximity_marketing/commit/b6a67bfb95fabde105e31e3c72863a681c65d39c))
- **release:** 1.0.2-development.1 [skip ci] ([f11961c](https://github.com/QQuik/quik_proximity_marketing/commit/f11961c40c8d7b074fc1723f70e785b7779647ac))
- **release:** 1.0.2-development.2 [skip ci] ([9421abd](https://github.com/QQuik/quik_proximity_marketing/commit/9421abd65f77fed2f388d929fb2e4da73b2f4797))
- **release:** 1.0.2-development.3 [skip ci] ([db1465f](https://github.com/QQuik/quik_proximity_marketing/commit/db1465f7d8b0e004a6254a47d8a2a48645b6826e))
- **release:** 1.0.2-development.4 [skip ci] ([947d71b](https://github.com/QQuik/quik_proximity_marketing/commit/947d71b1086a781010bc9fb5f98083dd1a20b8b0))
- **release:** 1.0.2-development.5 [skip ci] ([b86fe6a](https://github.com/QQuik/quik_proximity_marketing/commit/b86fe6a80ae621add807ab48ed2d25b7ced6bf96))
- **release:** 1.1.0 [skip ci] ([7a50701](https://github.com/QQuik/quik_proximity_marketing/commit/7a5070169f9b00f25dfbe4cad6bf280cfa1eb494))
- **release:** 1.1.0 [skip ci] ([089c89e](https://github.com/QQuik/quik_proximity_marketing/commit/089c89e77d94014b67c9a355ab91bceef81e9678))
- **release:** 1.1.0 [skip ci] ([eb39e34](https://github.com/QQuik/quik_proximity_marketing/commit/eb39e34d038b80ab84d72ae25a3d1cd506cc7cb7))
- **release:** 1.1.0 [skip ci] ([dfcdbcb](https://github.com/QQuik/quik_proximity_marketing/commit/dfcdbcb77c3e73dce694fcc5c0a6dba937c77c73))
- **release:** 1.1.0 [skip ci] ([a7acd04](https://github.com/QQuik/quik_proximity_marketing/commit/a7acd04da28f8a5b755933baeb5b8eba9d71d06a))
- **release:** 1.1.0 [skip ci] ([ab614bb](https://github.com/QQuik/quik_proximity_marketing/commit/ab614bbb0df1c403d711009fa7d974be43994e6f))
- **release:** 1.1.0 [skip ci] ([174439d](https://github.com/QQuik/quik_proximity_marketing/commit/174439d878cd770f68f26b2ce1e5fbd0ce22262d))
- **release:** 1.1.0 [skip ci] ([d7d4365](https://github.com/QQuik/quik_proximity_marketing/commit/d7d4365ad6cda9c551c5a9921f08df643cadcf36))
- **release:** 1.1.0-development.1 [skip ci] ([aa757c7](https://github.com/QQuik/quik_proximity_marketing/commit/aa757c7434563cd45db9e79db7846a0d3b9ce819))
- **release:** 1.1.0-development.10 [skip ci] ([ac730b5](https://github.com/QQuik/quik_proximity_marketing/commit/ac730b52256d7496eaa25695b06f15814a098814))
- **release:** 1.1.0-development.11 [skip ci] ([edd6605](https://github.com/QQuik/quik_proximity_marketing/commit/edd66053b9e6b2428f055271fbe64a5094b0eb96))
- **release:** 1.1.0-development.12 [skip ci] ([8ec2589](https://github.com/QQuik/quik_proximity_marketing/commit/8ec2589ae97bd6068869d4b400e3144f928c71fe))
- **release:** 1.1.0-development.13 [skip ci] ([ec92a43](https://github.com/QQuik/quik_proximity_marketing/commit/ec92a435197994a1874baf51e492fb71518a9eee))
- **release:** 1.1.0-development.14 [skip ci] ([b4fc66c](https://github.com/QQuik/quik_proximity_marketing/commit/b4fc66cd2d8a5969a2571b401c15daa7b6dfe836))
- **release:** 1.1.0-development.15 [skip ci] ([db85d96](https://github.com/QQuik/quik_proximity_marketing/commit/db85d96758eadba5d8b8fc77409e52b8080ca24e))
- **release:** 1.1.0-development.16 [skip ci] ([cddcb6b](https://github.com/QQuik/quik_proximity_marketing/commit/cddcb6b1f6d25744fc08f318ba2a9e0712a00bb1))
- **release:** 1.1.0-development.17 [skip ci] ([634b66b](https://github.com/QQuik/quik_proximity_marketing/commit/634b66bc9c5a69f9dda5924bd48c4c610410b435))
- **release:** 1.1.0-development.18 [skip ci] ([33c3f90](https://github.com/QQuik/quik_proximity_marketing/commit/33c3f903f26d546419b9c4eae831153a67204c35))
- **release:** 1.1.0-development.19 [skip ci] ([77b5687](https://github.com/QQuik/quik_proximity_marketing/commit/77b56870a026b21d56576e83ac8e0f5d5735bd22))
- **release:** 1.1.0-development.2 [skip ci] ([5dc3ab8](https://github.com/QQuik/quik_proximity_marketing/commit/5dc3ab81efc081924994fb4e0dbc5c34e42d3508))
- **release:** 1.1.0-development.20 [skip ci] ([d61efa7](https://github.com/QQuik/quik_proximity_marketing/commit/d61efa7429e69a91407cf4ca3aa02ab22f00bff0))
- **release:** 1.1.0-development.21 [skip ci] ([41bf92b](https://github.com/QQuik/quik_proximity_marketing/commit/41bf92bdb4aabaecd0cd0540cce5621e764aeb07))
- **release:** 1.1.0-development.22 [skip ci] ([11ba010](https://github.com/QQuik/quik_proximity_marketing/commit/11ba0109563ce89a091d0b9266d8b0daeb8d632f))
- **release:** 1.1.0-development.23 [skip ci] ([d292094](https://github.com/QQuik/quik_proximity_marketing/commit/d29209492b57450a441f911cf954fc9d33b065e2))
- **release:** 1.1.0-development.24 [skip ci] ([8c46aec](https://github.com/QQuik/quik_proximity_marketing/commit/8c46aec05408a294177fc636b5bbb77f31ce8ec7))
- **release:** 1.1.0-development.25 [skip ci] ([067630e](https://github.com/QQuik/quik_proximity_marketing/commit/067630e8b79848affd3f2b89fdb510744c7b3341))
- **release:** 1.1.0-development.26 [skip ci] ([18ed4fa](https://github.com/QQuik/quik_proximity_marketing/commit/18ed4fa9be3bc674ce7db8ab5b7beca9b583ca7a))
- **release:** 1.1.0-development.27 [skip ci] ([953a743](https://github.com/QQuik/quik_proximity_marketing/commit/953a743dcabacbc8901fe6c92e05bb710406459a))
- **release:** 1.1.0-development.28 [skip ci] ([441a6d7](https://github.com/QQuik/quik_proximity_marketing/commit/441a6d7211122457d76b821ba4e722c6df422898))
- **release:** 1.1.0-development.29 [skip ci] ([28c3bd4](https://github.com/QQuik/quik_proximity_marketing/commit/28c3bd469654fbb859693edbc39f7ff2f4441d11))
- **release:** 1.1.0-development.3 [skip ci] ([3e1fa05](https://github.com/QQuik/quik_proximity_marketing/commit/3e1fa05c584834a1910264be180b08ff8df9da51))
- **release:** 1.1.0-development.30 [skip ci] ([6a7b004](https://github.com/QQuik/quik_proximity_marketing/commit/6a7b004031e88e618d685868046c349de74ab271))
- **release:** 1.1.0-development.31 [skip ci] ([1f15e2d](https://github.com/QQuik/quik_proximity_marketing/commit/1f15e2dddd3126c0b00c11e435308f406d41d448))
- **release:** 1.1.0-development.32 [skip ci] ([cc60e10](https://github.com/QQuik/quik_proximity_marketing/commit/cc60e102df67af27d2f27c7b4f4f78b4cc77ab6b))
- **release:** 1.1.0-development.33 [skip ci] ([519cd33](https://github.com/QQuik/quik_proximity_marketing/commit/519cd3359339ad50a7e74852ad8ee7e8e4c816ce))
- **release:** 1.1.0-development.34 [skip ci] ([dfd2460](https://github.com/QQuik/quik_proximity_marketing/commit/dfd24602c2ebce32e46f29c7fa1f980b2b204370))
- **release:** 1.1.0-development.35 [skip ci] ([9ec6003](https://github.com/QQuik/quik_proximity_marketing/commit/9ec60034af04a8b22ecf2d61a42accc15c9d8079))
- **release:** 1.1.0-development.36 [skip ci] ([0c21524](https://github.com/QQuik/quik_proximity_marketing/commit/0c2152469b719e522c15b7a59c92a4246ef9efb5))
- **release:** 1.1.0-development.37 [skip ci] ([a967741](https://github.com/QQuik/quik_proximity_marketing/commit/a967741b1338114502ce980f072c0d34f6aa6be6))
- **release:** 1.1.0-development.38 [skip ci] ([b727d2a](https://github.com/QQuik/quik_proximity_marketing/commit/b727d2a0e995d63b7ed3de3b3725b888afaf5433))
- **release:** 1.1.0-development.39 [skip ci] ([0a2ce57](https://github.com/QQuik/quik_proximity_marketing/commit/0a2ce57e667cc02bb61a92e70b67016cba75e92a))
- **release:** 1.1.0-development.4 [skip ci] ([bc70fa8](https://github.com/QQuik/quik_proximity_marketing/commit/bc70fa8354145c3c4f77e567d801588b3e3b6243))
- **release:** 1.1.0-development.40 [skip ci] ([2074b20](https://github.com/QQuik/quik_proximity_marketing/commit/2074b202dc787a15629482860f5953fc4d7a7c53))
- **release:** 1.1.0-development.41 [skip ci] ([5aa6a14](https://github.com/QQuik/quik_proximity_marketing/commit/5aa6a149e7ff830a5d6525195080a95af9e11c12))
- **release:** 1.1.0-development.42 [skip ci] ([33344ca](https://github.com/QQuik/quik_proximity_marketing/commit/33344ca70f5b2b88658a5968d6e0632153f67aa2))
- **release:** 1.1.0-development.43 [skip ci] ([fe4c881](https://github.com/QQuik/quik_proximity_marketing/commit/fe4c881059f7f300a60fd1d90269b022034021d2))
- **release:** 1.1.0-development.44 [skip ci] ([559e2bc](https://github.com/QQuik/quik_proximity_marketing/commit/559e2bc2b98bcb2cdbdd782e44e95728e73c2d75))
- **release:** 1.1.0-development.45 [skip ci] ([3db5a94](https://github.com/QQuik/quik_proximity_marketing/commit/3db5a94d587ce5d48f42b39f5311c27d14ce4be6))
- **release:** 1.1.0-development.46 [skip ci] ([114ea84](https://github.com/QQuik/quik_proximity_marketing/commit/114ea84ee1107dc075c0a2373039eb8b039704db))
- **release:** 1.1.0-development.47 [skip ci] ([d40ae1a](https://github.com/QQuik/quik_proximity_marketing/commit/d40ae1ad1b8b765e2f4dc0035f88172de748d991))
- **release:** 1.1.0-development.48 [skip ci] ([1285efd](https://github.com/QQuik/quik_proximity_marketing/commit/1285efd50cccae99f8048e88715dc12da14836f7))
- **release:** 1.1.0-development.49 [skip ci] ([32ab711](https://github.com/QQuik/quik_proximity_marketing/commit/32ab7113cb7ae46036180cc597ac65827552fe82))
- **release:** 1.1.0-development.5 [skip ci] ([597b7fb](https://github.com/QQuik/quik_proximity_marketing/commit/597b7fbb6bc30db042c47050eec67ab8203080d0))
- **release:** 1.1.0-development.50 [skip ci] ([22f3577](https://github.com/QQuik/quik_proximity_marketing/commit/22f3577f8e1b0fada483e0e68caf983dd0a33d5d))
- **release:** 1.1.0-development.51 [skip ci] ([567edcf](https://github.com/QQuik/quik_proximity_marketing/commit/567edcfb0dfb01b033bd0efe2dc5cf382ebd8c0e))
- **release:** 1.1.0-development.52 [skip ci] ([34b0760](https://github.com/QQuik/quik_proximity_marketing/commit/34b0760333d92f909beeffbadc679403f220b6be))
- **release:** 1.1.0-development.53 [skip ci] ([8e9cfd7](https://github.com/QQuik/quik_proximity_marketing/commit/8e9cfd7be36d5bb17c6178f0e469d7f32be1060b))
- **release:** 1.1.0-development.54 [skip ci] ([d74b6ce](https://github.com/QQuik/quik_proximity_marketing/commit/d74b6ceea1373d044942fbebe789b53fc248bf1e))
- **release:** 1.1.0-development.55 [skip ci] ([2cd7951](https://github.com/QQuik/quik_proximity_marketing/commit/2cd7951abd7a07673de2e56a67e6f2b957a9ecda))
- **release:** 1.1.0-development.56 [skip ci] ([825be56](https://github.com/QQuik/quik_proximity_marketing/commit/825be56c144bb01bce135b9e96165369e369fa09))
- **release:** 1.1.0-development.57 [skip ci] ([43e9f7b](https://github.com/QQuik/quik_proximity_marketing/commit/43e9f7bea5b06b335961fa5cf7a393e73b310092))
- **release:** 1.1.0-development.58 [skip ci] ([26c1a4f](https://github.com/QQuik/quik_proximity_marketing/commit/26c1a4fa48968de30b4ba4f8f7317fa732d4eed4))
- **release:** 1.1.0-development.59 [skip ci] ([fdfff14](https://github.com/QQuik/quik_proximity_marketing/commit/fdfff14c5aec5646f85dfff0794ad02f39a2df86))
- **release:** 1.1.0-development.6 [skip ci] ([c705a14](https://github.com/QQuik/quik_proximity_marketing/commit/c705a147558579ff61b2081650acda959f8aec4f))
- **release:** 1.1.0-development.60 [skip ci] ([71b42aa](https://github.com/QQuik/quik_proximity_marketing/commit/71b42aad2bb356bb8879c2fe3ff89f85709f7964))
- **release:** 1.1.0-development.61 [skip ci] ([2a41805](https://github.com/QQuik/quik_proximity_marketing/commit/2a41805cff4d775cdf786de4cef4e92c40a76417))
- **release:** 1.1.0-development.62 [skip ci] ([74fae1f](https://github.com/QQuik/quik_proximity_marketing/commit/74fae1ffb2d8440395893c9fa5c46419872dd4f7))
- **release:** 1.1.0-development.63 [skip ci] ([3e78b07](https://github.com/QQuik/quik_proximity_marketing/commit/3e78b07e40b93b3a5584a63a1ffa65ab76009f33))
- **release:** 1.1.0-development.64 [skip ci] ([d6e7b7c](https://github.com/QQuik/quik_proximity_marketing/commit/d6e7b7c01df21102d334f1d0a85058bb31d43c55))
- **release:** 1.1.0-development.65 [skip ci] ([c10571f](https://github.com/QQuik/quik_proximity_marketing/commit/c10571f601ff7c69bd5f07bd53fa40dc701ad9db))
- **release:** 1.1.0-development.66 [skip ci] ([dd1760c](https://github.com/QQuik/quik_proximity_marketing/commit/dd1760c650946345dc9d9c3364436156d471f3a6))
- **release:** 1.1.0-development.67 [skip ci] ([a42853b](https://github.com/QQuik/quik_proximity_marketing/commit/a42853b6ff480e46b1f39e19531a0ab1a0a43cce))
- **release:** 1.1.0-development.68 [skip ci] ([e41bb6a](https://github.com/QQuik/quik_proximity_marketing/commit/e41bb6aeea273fe0991c9b72887d2eac3b0f4fc4))
- **release:** 1.1.0-development.69 [skip ci] ([b6f8152](https://github.com/QQuik/quik_proximity_marketing/commit/b6f8152ec6a2b901e6082959ade8f9f51cf2d210))
- **release:** 1.1.0-development.7 [skip ci] ([8568c4a](https://github.com/QQuik/quik_proximity_marketing/commit/8568c4a721b8433ce6280f99625fe3804f63ad26))
- **release:** 1.1.0-development.70 [skip ci] ([f3b7854](https://github.com/QQuik/quik_proximity_marketing/commit/f3b7854d68caf197b5404cfec6e2719fea979867))
- **release:** 1.1.0-development.71 [skip ci] ([3bb9d92](https://github.com/QQuik/quik_proximity_marketing/commit/3bb9d920ce6cc9feb1d5b8c3b5a9455d651d67f1))
- **release:** 1.1.0-development.72 [skip ci] ([a97d954](https://github.com/QQuik/quik_proximity_marketing/commit/a97d954d999b9dcf796a0bf8cc3bfcdee4cc2f17))
- **release:** 1.1.0-development.73 [skip ci] ([497b614](https://github.com/QQuik/quik_proximity_marketing/commit/497b61444cc538dce36f868918b09e6f8fefaba9))
- **release:** 1.1.0-development.74 [skip ci] ([21ec7c8](https://github.com/QQuik/quik_proximity_marketing/commit/21ec7c8248f4fe2456ab72a0f1ffd2cf4b5e2677))
- **release:** 1.1.0-development.75 [skip ci] ([6f16624](https://github.com/QQuik/quik_proximity_marketing/commit/6f16624960d354ede51cd26c8a54612391ee4c42))
- **release:** 1.1.0-development.76 [skip ci] ([2d121e7](https://github.com/QQuik/quik_proximity_marketing/commit/2d121e736e934b5a88de9e761b886e723a9ab367))
- **release:** 1.1.0-development.77 [skip ci] ([bc41e38](https://github.com/QQuik/quik_proximity_marketing/commit/bc41e38e3d07c3f9a95c70b04334e26f101b3454))
- **release:** 1.1.0-development.78 [skip ci] ([7da0baf](https://github.com/QQuik/quik_proximity_marketing/commit/7da0baf12d226ef16ccbf6173e0d9d3f266133a6))
- **release:** 1.1.0-development.79 [skip ci] ([8a85855](https://github.com/QQuik/quik_proximity_marketing/commit/8a858555ddfa892cb8aa3f4dd5a507e936cc9c2e))
- **release:** 1.1.0-development.8 [skip ci] ([e8181be](https://github.com/QQuik/quik_proximity_marketing/commit/e8181beae4e6089335fed26e05fa61eefa8008ef))
- **release:** 1.1.0-development.80 [skip ci] ([76f2cd7](https://github.com/QQuik/quik_proximity_marketing/commit/76f2cd797c3e75e0a9afe6b947d455d53925f930))
- **release:** 1.1.0-development.81 [skip ci] ([b155265](https://github.com/QQuik/quik_proximity_marketing/commit/b1552653b174cd11c55ce0850e666815b21f402c))
- **release:** 1.1.0-development.82 [skip ci] ([f228566](https://github.com/QQuik/quik_proximity_marketing/commit/f228566a39860cae8382d55a9eaf2eb0e72e30b0))
- **release:** 1.1.0-development.83 [skip ci] ([20b87d0](https://github.com/QQuik/quik_proximity_marketing/commit/20b87d06c7c1982caea15a8d30aa505d5e2ac033))
- **release:** 1.1.0-development.84 [skip ci] ([dc9541a](https://github.com/QQuik/quik_proximity_marketing/commit/dc9541af08815289a16cdef9d33c03419d67f6cb))
- **release:** 1.1.0-development.85 [skip ci] ([46cfb1f](https://github.com/QQuik/quik_proximity_marketing/commit/46cfb1f0ad9942fa1565eae7d1b0e114f02febab))
- **release:** 1.1.0-development.86 [skip ci] ([d562d89](https://github.com/QQuik/quik_proximity_marketing/commit/d562d89994b9addf10125269a3e7640d64202277))
- **release:** 1.1.0-development.87 [skip ci] ([66f9c50](https://github.com/QQuik/quik_proximity_marketing/commit/66f9c509a62cfedebcca99fe18c6138be4821d37))
- **release:** 1.1.0-development.88 [skip ci] ([c79d056](https://github.com/QQuik/quik_proximity_marketing/commit/c79d056071d2f00b51039ae298c490873b64edba))
- **release:** 1.1.0-development.89 [skip ci] ([79b776e](https://github.com/QQuik/quik_proximity_marketing/commit/79b776ee32cee93992a89f7f5e7d8edf260aa02f))
- **release:** 1.1.0-development.9 [skip ci] ([ef57798](https://github.com/QQuik/quik_proximity_marketing/commit/ef57798d272e969223fab870a7db99ee8660630c))
- **release:** 1.1.0-development.90 [skip ci] ([21bbc29](https://github.com/QQuik/quik_proximity_marketing/commit/21bbc2940aa90d29d0685e605a99a98893fd4051))
- remove debug logging statements from touchpoint migration ([c0a815e](https://github.com/QQuik/quik_proximity_marketing/commit/c0a815e2fe29e5f2248d123aaf98e88ad36be97c))
- remove docs & update i18n dropdown ([44de647](https://github.com/QQuik/quik_proximity_marketing/commit/44de64784e1ec72c745aea3de4ca611cf49539bf))
- remove old code ([6f40609](https://github.com/QQuik/quik_proximity_marketing/commit/6f40609327532fb4360586717b556744f95c90f6))
- remove old code ([f0e7eaa](https://github.com/QQuik/quik_proximity_marketing/commit/f0e7eaa525952304dcb767e67e7d196e271564ca))
- remove sentry example page ([71fbcb1](https://github.com/QQuik/quik_proximity_marketing/commit/71fbcb18883e09d43a210506285a6271432e9947))
- remove sentry to show source map ([607bdbd](https://github.com/QQuik/quik_proximity_marketing/commit/607bdbd3d3a1204e87c48960ab5d4561db52d45f))
- remove sourcemap ([dc34fb9](https://github.com/QQuik/quik_proximity_marketing/commit/dc34fb9df7486b2143f30f17ad4c1e9290e6933c))
- replace FZ Poppins with BeVietnamPro font family and update button styles ([e6174c2](https://github.com/QQuik/quik_proximity_marketing/commit/e6174c2f1c0b4d320e5114f3b55e17131415ace4))
- restructure some file/folder ([#357](https://github.com/QQuik/quik_proximity_marketing/issues/357)) ([348ef07](https://github.com/QQuik/quik_proximity_marketing/commit/348ef07e6c98ee788953a0834d652798123c1a9d))
- revert env & change host ([9bbbdc1](https://github.com/QQuik/quik_proximity_marketing/commit/9bbbdc152ce0c8eb2b508966608912d6707253d7))
- temporarily disable CombinedFilter and CurrentFilters components in analytics view ([b7bc9f1](https://github.com/QQuik/quik_proximity_marketing/commit/b7bc9f1b8ad14cae873428f5fd676676d4716230))
- test cicd ([c307579](https://github.com/QQuik/quik_proximity_marketing/commit/c3075792c8315020bccfed295f885ac27d71f483))
- test cicd ([b92b826](https://github.com/QQuik/quik_proximity_marketing/commit/b92b8269c700a172125fe28c5c57bc6fcccb0a13))
- test parcelvoy auth ([fdf3c27](https://github.com/QQuik/quik_proximity_marketing/commit/fdf3c27ee1d9bf0289188d1438aabab5f0ffcf7b))
- update .env.prod ([b5111eb](https://github.com/QQuik/quik_proximity_marketing/commit/b5111eb04a1d703f10abbecd4f38ab6e43958fdc))
- update cicd ([b89a6df](https://github.com/QQuik/quik_proximity_marketing/commit/b89a6df6597916cb5f6b4919aa693060b6974ee9))
- update cicd ([8d29524](https://github.com/QQuik/quik_proximity_marketing/commit/8d29524cd88a51cc558dc0aa3b8f3590e1efd478))
- update dev env encoded ([e9096c3](https://github.com/QQuik/quik_proximity_marketing/commit/e9096c33ff3fb8d7ac1d709ffb7c57b3747fa84e))
- update encrypted development environment variables ([f5d9e1f](https://github.com/QQuik/quik_proximity_marketing/commit/f5d9e1f9e59f78ece240fb21bee1a3b11a7cac27))
- update encrypted development environment variables ([80d5457](https://github.com/QQuik/quik_proximity_marketing/commit/80d545799196e3f2e1d159e3baaeded115d125d1))
- update env ([89266f6](https://github.com/QQuik/quik_proximity_marketing/commit/89266f669be74fa640ff3146d9849b156e118f59))
- update env encoded ([dbf18ca](https://github.com/QQuik/quik_proximity_marketing/commit/dbf18ca8f29d2ab9e5082dc0cac5c042595a1531))
- update error message and remove endOfLine config in prettier ([f6cd34a](https://github.com/QQuik/quik_proximity_marketing/commit/f6cd34a5af907faa5545ddb56ef1e2328c321b57))
- update lockable section groupcss name ([4a6d86c](https://github.com/QQuik/quik_proximity_marketing/commit/4a6d86c2ba6b6b310efc9fc344e03b1546bbd9c3))
- update minor detail ([#384](https://github.com/QQuik/quik_proximity_marketing/issues/384)) ([82a9646](https://github.com/QQuik/quik_proximity_marketing/commit/82a96469ba662990510632e32725231eaab3bc58))
- update new .env.enc ([788cbdd](https://github.com/QQuik/quik_proximity_marketing/commit/788cbdd31c89642a228e6e5e3800538c10319844))
- update new encoded env ([3150d7a](https://github.com/QQuik/quik_proximity_marketing/commit/3150d7af58c63714a1d067d25c120986ab8e1dda))
- update prettier ([eda7999](https://github.com/QQuik/quik_proximity_marketing/commit/eda7999709c526540326ddf5d65b6c1e5e1fbfc3))
- update readme for project structure ([98d2f57](https://github.com/QQuik/quik_proximity_marketing/commit/98d2f5701dbf583895a8a101869838c30b84bf09))
- update releaserc json ([92568df](https://github.com/QQuik/quik_proximity_marketing/commit/92568df4f866a9da9701cda7c727eeed975cd621))
- update translation and return text ([#385](https://github.com/QQuik/quik_proximity_marketing/issues/385)) ([31b0f04](https://github.com/QQuik/quik_proximity_marketing/commit/31b0f0478988c14ccf8a8a3f656707791081fbef))
- update translation files ([#374](https://github.com/QQuik/quik_proximity_marketing/issues/374)) ([03a2d9b](https://github.com/QQuik/quik_proximity_marketing/commit/03a2d9b11c7b8e1af12d15a7543b003a4c42b996))
- update translation for UX ([#383](https://github.com/QQuik/quik_proximity_marketing/issues/383)) ([73523f8](https://github.com/QQuik/quik_proximity_marketing/commit/73523f82cf6e2a708436c7ad812648211bdeced5))
- update UI bugs ([#446](https://github.com/QQuik/quik_proximity_marketing/issues/446)) ([635d141](https://github.com/QQuik/quik_proximity_marketing/commit/635d141195b9fc450b6c7bfad33a44f1aa312b61))
- update using hook usedayjs topperformance tp text ([#377](https://github.com/QQuik/quik_proximity_marketing/issues/377)) ([91fce81](https://github.com/QQuik/quik_proximity_marketing/commit/91fce81eab6543a983e6a5ea5cc00dcdaaa97274))
- update width select column query key qr list ([#450](https://github.com/QQuik/quik_proximity_marketing/issues/450)) ([38c94b0](https://github.com/QQuik/quik_proximity_marketing/commit/38c94b0ad2bb85292c633783ae57a9f855b7756c))
- use dayjs shared lib ([#378](https://github.com/QQuik/quik_proximity_marketing/issues/378)) ([348a284](https://github.com/QQuik/quik_proximity_marketing/commit/348a28466893b0553034fd08bb42c70f5807b8da))

### 🎨 Code Style

- add skeleton for smooth ([f3184b0](https://github.com/QQuik/quik_proximity_marketing/commit/f3184b05e51d9d372a14d3b21f4c7ad9965d77a9))
- adding style inherit to override default style of sonner ([#345](https://github.com/QQuik/quik_proximity_marketing/issues/345)) ([309912d](https://github.com/QQuik/quik_proximity_marketing/commit/309912dc50d1d63aba35dd2550e691651dd60f6b))
- fix border & try to fix qr download ([184cd56](https://github.com/QQuik/quik_proximity_marketing/commit/184cd560bb819abfd2d64c49a2352d6a1d799f7c))
- fix chart pie in analytic page ([14b7599](https://github.com/QQuik/quik_proximity_marketing/commit/14b7599bd11b5aff591662b2a1add2f0263d6cea))
- fix color chart ([10df64e](https://github.com/QQuik/quik_proximity_marketing/commit/10df64e5e4643ea8f85b2498133d99d4d653a230))
- fix color for toast description on darktheme ([dcaf507](https://github.com/QQuik/quik_proximity_marketing/commit/dcaf5078efbf8e4df1015d12fe2c1b14cf3d1b4a))
- make advanced analytic's last 2 tabs not clickable ([f9e2cdb](https://github.com/QQuik/quik_proximity_marketing/commit/f9e2cdb00d0120a4a583e106d27e9911ad90a7d0))
- remove deployment dependency from semantic release job ([e09766f](https://github.com/QQuik/quik_proximity_marketing/commit/e09766feb9750e244eb73e1193d5846c03542257))
- remove input border and outline styles in base input component ([da3e50b](https://github.com/QQuik/quik_proximity_marketing/commit/da3e50b249c3a536b7debaeda2846227d1e9c3ea))
- update chart color ([24f50f6](https://github.com/QQuik/quik_proximity_marketing/commit/24f50f62f5ed0499781b1b9b2b226fa3c6330f59))
- update QR code styling with square dots and corners, adjust UI spacing ([05c3b63](https://github.com/QQuik/quik_proximity_marketing/commit/05c3b637cfe4224c77e85691313e0a7859180471))
- update secondary color to purple in dark theme ([63a465a](https://github.com/QQuik/quik_proximity_marketing/commit/63a465af42026f4e02540d1420a81ccfa67d0cf1))
- update style for not misunderstanding ([4587567](https://github.com/QQuik/quik_proximity_marketing/commit/45875674ddfb80ba28b7b572a87f8229af97895b))
- update UI components with consistent sizing and improved visual design ([6655908](https://github.com/QQuik/quik_proximity_marketing/commit/6655908bc816baceed55814406d52334ebcfe983))

### 🚀 Performance Improvements

- implement code splitting and optimize package imports for better performance ([#431](https://github.com/QQuik/quik_proximity_marketing/issues/431)) ([f5426b4](https://github.com/QQuik/quik_proximity_marketing/commit/f5426b4b589d8c110e671d2f183f4d3ee1e60e9f))

## 1.0.0 (2025-09-29)

### ✨ Features

- "handle back btn for app" ([e8a8623](https://github.com/QQuik/quik_proximity_marketing/commit/e8a8623720f15ee363ebe311ecbde72423df097c))
- add 3 links per day limit and auto-delete after 7 days for anonymous touch points ([4b2fade](https://github.com/QQuik/quik_proximity_marketing/commit/4b2fade6b2617f9048c2c287d9e0da8e9bbf3032))
- add advanced analytic with mockup data ([#351](https://github.com/QQuik/quik_proximity_marketing/issues/351)) ([01ea0ec](https://github.com/QQuik/quik_proximity_marketing/commit/01ea0ececcb250ee0a0cf4a48cc0837b573d439e))
- add ai generate slug components ([8e09ba4](https://github.com/QQuik/quik_proximity_marketing/commit/8e09ba41141039e494f4c2a3a42f6a5678e656c9))
- add analytic view ([7f28531](https://github.com/QQuik/quik_proximity_marketing/commit/7f2853124aa76e28accf63c80267fd626b415b8c))
- add analytics for touch point & add comparison ([81d9f0b](https://github.com/QQuik/quik_proximity_marketing/commit/81d9f0b9e7e6d7d7c10a980cddb594b39ff1a1cb))
- add animation card ([25568da](https://github.com/QQuik/quik_proximity_marketing/commit/25568daaaf61395444615b78f1c82eebfa26f470))
- add app selection after login ([6278426](https://github.com/QQuik/quik_proximity_marketing/commit/6278426f7e1898c17f86cabb3f13b24d9ef5b42b))
- add app selection page with Proxify and Parcelvoy options ([d364117](https://github.com/QQuik/quik_proximity_marketing/commit/d36411748a828b45bf717d618386d563ece5a3c8))
- add audit log for email & registration event & first 200 premium grants ([495a252](https://github.com/QQuik/quik_proximity_marketing/commit/495a25205fb8a0df8d737138c9b3c591fca46648))
- add audit logs & new rpc func for campaign free 200 premium ([16b8acb](https://github.com/QQuik/quik_proximity_marketing/commit/16b8acbf73100aa056fdb522a0c54ac6b142f188))
- add behavior tabs with api ([#365](https://github.com/QQuik/quik_proximity_marketing/issues/365)) ([93600ec](https://github.com/QQuik/quik_proximity_marketing/commit/93600ec7fb90c0ea76834ce6796223ad648ecf9c))
- add behavior tabs with mockdata [#364](https://github.com/QQuik/quik_proximity_marketing/issues/364) ([caaf378](https://github.com/QQuik/quik_proximity_marketing/commit/caaf378e40672365d57c71bc76fd2a33beae35bb))
- add bootstrap client ([#388](https://github.com/QQuik/quik_proximity_marketing/issues/388)) ([3e247fc](https://github.com/QQuik/quik_proximity_marketing/commit/3e247fc1a84a37db163e39b1bdca728ad0b11fa5))
- add campaign detail page & touch point list & handle for touch point create/delete ([cdd5da2](https://github.com/QQuik/quik_proximity_marketing/commit/cdd5da26d5d7d37e4e0d01cfd9e5a1616b9493e0))
- add campaign management ([#16](https://github.com/QQuik/quik_proximity_marketing/issues/16)) ([06e6792](https://github.com/QQuik/quik_proximity_marketing/commit/06e6792380745bfc47270d0b892be077b0a68243))
- add chat-woot ([55d1da4](https://github.com/QQuik/quik_proximity_marketing/commit/55d1da48e6e29741c53c390764b54035dc62393e))
- add custom domain handle ([5027a47](https://github.com/QQuik/quik_proximity_marketing/commit/5027a470c52f55bea1441d47b14d8044764e74b7))
- add custom domain support for touch point short links ([636767c](https://github.com/QQuik/quik_proximity_marketing/commit/636767ccd593988d55400d3b745e70d352960361))
- add dashboard page & analytics page ([713e04f](https://github.com/QQuik/quik_proximity_marketing/commit/713e04fcc38701d60b2b13a466d6c504737e000b))
- add dashboard view & components ([de4d858](https://github.com/QQuik/quik_proximity_marketing/commit/de4d8580d3dbfb490b249bbf44a8bd6860ead1d8))
- add detail vietnam map & show list location ([febb4c5](https://github.com/QQuik/quik_proximity_marketing/commit/febb4c59cde20b1be07ba4ff6e3b556c50b268f3))
- add dialog when not found profile & new method to check premium ([b12e206](https://github.com/QQuik/quik_proximity_marketing/commit/b12e2065843e2466a33d321826cc5a2959350906))
- Add docusaurus ([b1da105](https://github.com/QQuik/quik_proximity_marketing/commit/b1da105c30483dd7c85c6dc172eb541166124f51))
- add domain verification flow and improve UI for custom domains ([3bab761](https://github.com/QQuik/quik_proximity_marketing/commit/3bab761f2132d88cf42fd9e7701ce474ba13da2f))
- add domain-based cookie handling for cross-subdomain authentication ([38550b0](https://github.com/QQuik/quik_proximity_marketing/commit/38550b004d0d947a6d06824b0edb75a73ab43fc6))
- add download button for QR code in migrated anonymous dialog ([cd884bb](https://github.com/QQuik/quik_proximity_marketing/commit/cd884bb08e84e7c17b4eaddbe492c2b867aeead3))
- add env scripts and encoded .env ([47dc4f0](https://github.com/QQuik/quik_proximity_marketing/commit/47dc4f00c76544827094b0a87b82e2a0fe22c179))
- add error boundary to log error into openobserve ([99b6913](https://github.com/QQuik/quik_proximity_marketing/commit/99b691323d326e28d7f6d36c15305261b99dd526))
- add expiration dates and SameSite policy to auth cookies ([92421db](https://github.com/QQuik/quik_proximity_marketing/commit/92421dbc392fd0b624ff4d8bff8a3660b4d48534))
- add expires at into orgplan ([6f94dfc](https://github.com/QQuik/quik_proximity_marketing/commit/6f94dfcee6b0c07aed95652d04454050fcc98520))
- add export json file in docker compose ([9f0e3d0](https://github.com/QQuik/quik_proximity_marketing/commit/9f0e3d052bdd24985d24c6a1f56a7ef9930789d8))
- add filter/search/sort reusable components & default config for react-query, axios,.. ([6f6b200](https://github.com/QQuik/quik_proximity_marketing/commit/6f6b200ba72eb59be65fb38705a234d4c40aa2df))
- add form dirty state tracking and reset functionality for QR customization ([ed893e4](https://github.com/QQuik/quik_proximity_marketing/commit/ed893e4c9f275e291118e46e290a4b637a237cda))
- add free premium for limit 5 ip & 1 fp ([d39e363](https://github.com/QQuik/quik_proximity_marketing/commit/d39e36338d9969419567f1c0b697425550730bec))
- add gtm id to entry app ([43aaadc](https://github.com/QQuik/quik_proximity_marketing/commit/43aaadcff62174d6254c3ece240e5851ee75a4c5))
- add host to allowed CORS headers in middleware ([09e8d1b](https://github.com/QQuik/quik_proximity_marketing/commit/09e8d1b90718c59043db6c141cf4a196f0d292c8))
- add i18n for server ([#325](https://github.com/QQuik/quik_proximity_marketing/issues/325)) ([5dbe9f2](https://github.com/QQuik/quik_proximity_marketing/commit/5dbe9f2c6d2cc66aa220f5321216875019a50eb1))
- add i18n support for error messages in react-query error handler ([67e1bc5](https://github.com/QQuik/quik_proximity_marketing/commit/67e1bc515a996a02ea4fbe593fda7bfaec7d9bb5))
- add i18n support for error messages with default fallbacks ([5249af9](https://github.com/QQuik/quik_proximity_marketing/commit/5249af9c180276f8d68620add84ce8c856db9576))
- add integration form for touch point ([da1e263](https://github.com/QQuik/quik_proximity_marketing/commit/da1e263406878de41d95292ea23184cdc71df473))
- add integration limit and plan tracking for organizations ([9e66808](https://github.com/QQuik/quik_proximity_marketing/commit/9e66808249beba802e60ca7131ab8baf9e059c06))
- add integration module to menulist ([11c12be](https://github.com/QQuik/quik_proximity_marketing/commit/11c12be99c5ecb35a301efe0eb7ad2ca416290eb))
- add invitation detail API and query hook ([3db891e](https://github.com/QQuik/quik_proximity_marketing/commit/3db891e9d40e7e0c3ae6e97863a84f93d59a34a2))
- add lazy load into advanced analytic overview page ([26ee8ba](https://github.com/QQuik/quik_proximity_marketing/commit/26ee8ba48b3dc42c6b04a36f1ec9cd12ea539956))
- add limit 200 for free pre ([233e9ca](https://github.com/QQuik/quik_proximity_marketing/commit/233e9ca0a82c61dc4073a1bc1936408596a233a5))
- add locale support for AI-generated slugs and improve error handling ([#410](https://github.com/QQuik/quik_proximity_marketing/issues/410)) ([bf592b0](https://github.com/QQuik/quik_proximity_marketing/commit/bf592b0cc95361adc81248d8564f12c2eea0d5ca))
- add localized format plugin and simplify anon touch points response structure ([a2a9107](https://github.com/QQuik/quik_proximity_marketing/commit/a2a9107ca1301efc84e2191bf48375b5c2bef97d))
- add login with google ([7f32180](https://github.com/QQuik/quik_proximity_marketing/commit/7f321805863ff1c20b977a8de54db63592dcf954))
- add maxLength validation to tag inputs with 32 character limit ([f8d031f](https://github.com/QQuik/quik_proximity_marketing/commit/f8d031fe0a2d4f78708d55baf5dcea39736e57a0))
- add member module ([662a0f6](https://github.com/QQuik/quik_proximity_marketing/commit/662a0f69182c8c04228640bbe0bdf66aca118026))
- add meta tags support for touch points with image upload ([6bc8823](https://github.com/QQuik/quik_proximity_marketing/commit/6bc8823f97002f824ca25aa239182bb564afe29c))
- add metadata as i18n ([5b35ffb](https://github.com/QQuik/quik_proximity_marketing/commit/5b35ffb67588fa68b3de965ccf0264a52cd3c4c0))
- add monthly plan for org & update plan lib ([#228](https://github.com/QQuik/quik_proximity_marketing/issues/228)) ([7000a5d](https://github.com/QQuik/quik_proximity_marketing/commit/7000a5d7ef6a20b925a185d50c8130a4d1d0e412))
- add name validation to touch point update schema with min/max length ([83869e9](https://github.com/QQuik/quik_proximity_marketing/commit/83869e95b93766ef88244466c7127a4a9be4ccf2))
- add NoDataIcon component and update UI styling across multiple components ([1b934fa](https://github.com/QQuik/quik_proximity_marketing/commit/1b934faee899c66b9c825697112f679f89c8d93b))
- add openobserve browser rum ([7d9a2fd](https://github.com/QQuik/quik_proximity_marketing/commit/7d9a2fd61161ad08e43801bd5c3798ff773999a8))
- add OPTIONS handler with CORS support for touch-point endpoints ([5e23d38](https://github.com/QQuik/quik_proximity_marketing/commit/5e23d3801e5c9a73f5dff64d4aa1b389bcf6bad7))
- Add organization member invitation with email notification and role management ([abc8363](https://github.com/QQuik/quik_proximity_marketing/commit/abc836362af621a623334971ffc154d9453d46a2))
- add pagination & sorting handle ([f67020b](https://github.com/QQuik/quik_proximity_marketing/commit/f67020b3d4f3d4315b0a9c59ca4607e067baa644))
- add permission handler for BE & FE ([aaa0ba4](https://github.com/QQuik/quik_proximity_marketing/commit/aaa0ba422105af81de88a989906f25de806e9edf))
- add QR logo image upload and customize options for touch points ([3f176fd](https://github.com/QQuik/quik_proximity_marketing/commit/3f176fda1ff5f758b74958f6db21c3235a7867e4))
- add queue auto verify domain ([d4c458a](https://github.com/QQuik/quik_proximity_marketing/commit/d4c458aa4349798e0d20326280e409c8a89245ea))
- add real api into advanced analytic ([#359](https://github.com/QQuik/quik_proximity_marketing/issues/359)) ([1324db1](https://github.com/QQuik/quik_proximity_marketing/commit/1324db175155458d5318b07fe829226ae49fac11))
- add release auto on cicd ([#334](https://github.com/QQuik/quik_proximity_marketing/issues/334)) ([bc59122](https://github.com/QQuik/quik_proximity_marketing/commit/bc591221d9131456e30e69becb8a6d1f2451b315))
- add reusable table ([89376ab](https://github.com/QQuik/quik_proximity_marketing/commit/89376abbe70b3c3cffbebc57cee9d924384aacf4))
- add sample config for nginx ([#201](https://github.com/QQuik/quik_proximity_marketing/issues/201)) ([927ad94](https://github.com/QQuik/quik_proximity_marketing/commit/927ad9439f6bf30cb32cb3434b7bd21cd54bacd5))
- add schedule calendar filter ([#32](https://github.com/QQuik/quik_proximity_marketing/issues/32)) ([c95bf7e](https://github.com/QQuik/quik_proximity_marketing/commit/c95bf7ec2b81f368fae5234b04612a352b32f8a5))
- add schedule delete action ([d367f55](https://github.com/QQuik/quik_proximity_marketing/commit/d367f5567675b82fa3736994c670d0a5cc05f679))
- add schedule schema & some schedule components ([8fb9384](https://github.com/QQuik/quik_proximity_marketing/commit/8fb9384eed0d5558379b7086d5b1c2601de4eac4))
- add service-to-service authentication with API key validation ([#432](https://github.com/QQuik/quik_proximity_marketing/issues/432)) ([29ec851](https://github.com/QQuik/quik_proximity_marketing/commit/29ec8518c555bad37af77bdde2f86e1362268199))
- add short code as default slug ([04f7e0c](https://github.com/QQuik/quik_proximity_marketing/commit/04f7e0ccde65ae5231110317a665dc3c7edcfc36))
- add show confirm dialog method to formwarning provider ([3da861a](https://github.com/QQuik/quik_proximity_marketing/commit/3da861a1bdfece689ac3841e72c342f75e8b9f5b))
- add start/end adornment support to Input component and update touch point domain management ([90ce548](https://github.com/QQuik/quik_proximity_marketing/commit/90ce548c84e4261ed5677195de83ce7ad4ae3238))
- add tag module & remove tp, location module ([ae4d040](https://github.com/QQuik/quik_proximity_marketing/commit/ae4d040e995f73b3a2fc72d555cd1fdb212b4861))
- add tag module & remove tp, location module ([5da4936](https://github.com/QQuik/quik_proximity_marketing/commit/5da49361fdbbdc48d8b1ec89714391537ebf5826))
- add timezone ([#348](https://github.com/QQuik/quik_proximity_marketing/issues/348)) ([b2112f3](https://github.com/QQuik/quik_proximity_marketing/commit/b2112f3ae964103e98d3eccece0eb1d3a6746328))
- add today performance & fix advanced form in tp ([3032f71](https://github.com/QQuik/quik_proximity_marketing/commit/3032f71e37d1ef4c13958c5ed4064fed53dae4c4))
- add token refresh handling and QR code URL tracking parameter ([4b3148d](https://github.com/QQuik/quik_proximity_marketing/commit/4b3148d4a2709d50bd0aa5a29e604eee0343d223))
- add tooltip & fix ui, new integration list UI ([18afa5e](https://github.com/QQuik/quik_proximity_marketing/commit/18afa5e53b5e573fb72fc26a471913b013fe196c))
- add topo map to view locations ([8030a1a](https://github.com/QQuik/quik_proximity_marketing/commit/8030a1a3e87ed5c50efb77bb9dd74c3f18f4cbc2))
- add touch point & location CRUD ([cce8213](https://github.com/QQuik/quik_proximity_marketing/commit/cce82133df29989f22cc46cca490fa6d48eae2df))
- add touch point advanced settings & utm form ([5d36cf3](https://github.com/QQuik/quik_proximity_marketing/commit/5d36cf3b72dc8388a6dd65ce1d69cc6092830d82))
- add touch point analytics page ([5498f11](https://github.com/QQuik/quik_proximity_marketing/commit/5498f111425445dbb0d522512267ef710691cf38))
- add touch point create/update/delete handle ([cd376a3](https://github.com/QQuik/quik_proximity_marketing/commit/cd376a391b3a5aa75afc059352225cd6d3512fbf))
- add touch point detail page & schedule components ([732d07b](https://github.com/QQuik/quik_proximity_marketing/commit/732d07bfc846f453c58542f8b0a1df044e99261f))
- add treafik to docker-compose.dev ([3d6a661](https://github.com/QQuik/quik_proximity_marketing/commit/3d6a6616fdfd38716705c61664aa4e6db20f0b7c))
- add ui & api for many modules ([a254d8c](https://github.com/QQuik/quik_proximity_marketing/commit/a254d8c14542371211ecd9b323ef5dce52b6eb8f))
- add user id to parcel get access token ([8659a69](https://github.com/QQuik/quik_proximity_marketing/commit/8659a698bd279cba99f51310ca1935faf2a2dcb6))
- add user tracking for custom slugs and disable account deletion temporarily ([cf652f3](https://github.com/QQuik/quik_proximity_marketing/commit/cf652f37b8dc32d5f6cf22140c37e90bb61f3b30))
- add verify url on tp form ([3f3d52c](https://github.com/QQuik/quik_proximity_marketing/commit/3f3d52c141093ebdbc88f16cf0f43fc8016ef75e))
- add vitest & remove docs ([#322](https://github.com/QQuik/quik_proximity_marketing/issues/322)) ([382a5ec](https://github.com/QQuik/quik_proximity_marketing/commit/382a5ecb6aac211d76469244131e3f1cdc979d92))
- change plan provider ([47f7687](https://github.com/QQuik/quik_proximity_marketing/commit/47f7687774b4c19575a3bfb13cb13abd29b25ba8))
- comment old file & add git workflows file ([#17](https://github.com/QQuik/quik_proximity_marketing/issues/17)) ([7a8cbb6](https://github.com/QQuik/quik_proximity_marketing/commit/7a8cbb6e2d8427996a7653e0b4ba5650491ae32b))
- create qr svg when user create tp ([199eb61](https://github.com/QQuik/quik_proximity_marketing/commit/199eb617138f3a6cd564c9b87cd589dec7efc0bf))
- enhance CreateDomainForm and API response structure with improved error handling and new types ([b8e13a5](https://github.com/QQuik/quik_proximity_marketing/commit/b8e13a51f836fcf7f34dea0c9dfdfb190ebe0d9b))
- enhance error handling in touch point creation with rollback and localized messages ([ab889ac](https://github.com/QQuik/quik_proximity_marketing/commit/ab889ac9a397392327991997d2cfb7ebae04e314))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([60f6509](https://github.com/QQuik/quik_proximity_marketing/commit/60f6509b9c53a04b3ffc1a6b201bcaf3058f4ef2))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([9282d60](https://github.com/QQuik/quik_proximity_marketing/commit/9282d60f154eaa6beac85f7c73b4b76f7ffb950f))
- fix login page ([e270ca5](https://github.com/QQuik/quik_proximity_marketing/commit/e270ca546811a3176e5e26490473e255312d0e38))
- fix refresh token invalid cause app redirect multi times ([ebfd588](https://github.com/QQuik/quik_proximity_marketing/commit/ebfd588af1041631d98747f14dc1eef4994a62cf))
- fix some bugs & add plan for meta tags ([838e18f](https://github.com/QQuik/quik_proximity_marketing/commit/838e18fcce4dbd5a606b5174c01412025dc9a152))
- handle form for condition node ([ff3c273](https://github.com/QQuik/quik_proximity_marketing/commit/ff3c2734ec9e1ed6216949354ce869e178377c7d))
- handle unsave form aleart ([2df70e4](https://github.com/QQuik/quik_proximity_marketing/commit/2df70e441c18e9870306ab69a5d5ace3b8fe71e7))
- implement activity line chart with daily trend visualization and analytics ([#360](https://github.com/QQuik/quik_proximity_marketing/issues/360)) ([7535f4c](https://github.com/QQuik/quik_proximity_marketing/commit/7535f4c239b457ebe925859393bbe50ab303ae93))
- implement advanced analytics filtering with tags and touchpoints selection ([3cd7105](https://github.com/QQuik/quik_proximity_marketing/commit/3cd7105411a5bd0acaf6c9738376239bbadadbe8))
- implement advanced filter UI with tag and touchpoint selection ([128412d](https://github.com/QQuik/quik_proximity_marketing/commit/128412ddfca1a2187a477b3ea9678e54efaa8ec3))
- implement AI provider key rotation and caching system for slug generation ([4fbb948](https://github.com/QQuik/quik_proximity_marketing/commit/4fbb948a86fb2a369e7c661ce3f98cb42938253a))
- implement AI-powered slug generation with LiteLLM and Firecrawler integration ([cfd6035](https://github.com/QQuik/quik_proximity_marketing/commit/cfd603557c501316c54509a00b21b7868c744712))
- implement anon migration with pending touch points and user profile API ([#422](https://github.com/QQuik/quik_proximity_marketing/issues/422)) ([bd22dd9](https://github.com/QQuik/quik_proximity_marketing/commit/bd22dd9698ec67a76084dce2508b8fcd595cc143))
- implement anonymous touch points API with middleware and schema validation ([85f0217](https://github.com/QQuik/quik_proximity_marketing/commit/85f0217dd263a00bab558470ac1fb222afaf833c))
- implement anonymous touch points API with repository and service layers ([6bbb254](https://github.com/QQuik/quik_proximity_marketing/commit/6bbb254cd592e86959f8aad808dd5002e3f14624))
- implement auth refresh and logout endpoints with cookie management ([2947847](https://github.com/QQuik/quik_proximity_marketing/commit/294784782360d28fb4a7ca14c6f3c01bfeda7a58))
- implement CORS middleware with domain allowlist for public API endpoints ([55da9f6](https://github.com/QQuik/quik_proximity_marketing/commit/55da9f66e4aba8f56b3f216acb91f91e614217cf))
- implement flow builder with drag-and-drop nodes and properties sidebar ([d8ce71b](https://github.com/QQuik/quik_proximity_marketing/commit/d8ce71b02f7e14f3891d35c52b86697730848c84))
- implement i18n on api & zod ([#380](https://github.com/QQuik/quik_proximity_marketing/issues/380)) ([c6a47e8](https://github.com/QQuik/quik_proximity_marketing/commit/c6a47e8debc39c3ffb550c880063ae175af71d69))
- implement locale and timezone management with dayjs integration ([5843c0f](https://github.com/QQuik/quik_proximity_marketing/commit/5843c0f4b7c220b81b0e5ea78c42b856dbde8541))
- implement server-side timezone and locale handling with dayjs integration ([35841cf](https://github.com/QQuik/quik_proximity_marketing/commit/35841cff7947172880f83327032f2ee49fb34eb5))
- implement timezone handling across analytics and dashboard components ([e58fbbd](https://github.com/QQuik/quik_proximity_marketing/commit/e58fbbdaa587ab4d63ea06f3f7eb209739ac0593))
- init analytic page ([01b2000](https://github.com/QQuik/quik_proximity_marketing/commit/01b20005ceada2704fc3db57f07a8382631da7cc))
- init glitch ([daf9ba6](https://github.com/QQuik/quik_proximity_marketing/commit/daf9ba6cbfb41b53b7b9b9e722cf94eb77505670))
- init permissions ([1dd69f2](https://github.com/QQuik/quik_proximity_marketing/commit/1dd69f261f5682cbf34c81ec6ecefa7494db603a))
- init prj ([424a864](https://github.com/QQuik/quik_proximity_marketing/commit/424a86475e7ee361d598cc1deb8825a71953dc2e))
- limit active time range display to 3 hours in channel analysis ([05ff693](https://github.com/QQuik/quik_proximity_marketing/commit/05ff6935e69fad2313a72d067228396442fed061))
- limit anonymous users to 1 total touch point instead of 3 per day ([96ed895](https://github.com/QQuik/quik_proximity_marketing/commit/96ed895a73287a5db752c54d794cb8e89cca9afa))
- Migrate organization provider to Zustand store and add form warning provider ([d560fa2](https://github.com/QQuik/quik_proximity_marketing/commit/d560fa2e637840e97b4d02c88c232c4c44a0252b))
- modify code & add hook & api for advanced analytics ([#355](https://github.com/QQuik/quik_proximity_marketing/issues/355)) ([e3f639c](https://github.com/QQuik/quik_proximity_marketing/commit/e3f639c36a90ac0d406cc45acc92fb6c29b35915))
- modify script and workflow to work with .env.development ([e1b2d5c](https://github.com/QQuik/quik_proximity_marketing/commit/e1b2d5cec75565b09fe92c284c5c8e9f7a6e2ba2))
- modify UI & flow ([7102a0f](https://github.com/QQuik/quik_proximity_marketing/commit/7102a0f859b7cd7369decaf3689a446f7e39ebcc))
- move custom domains to dedicated page and improve filter UI ([43aa0a3](https://github.com/QQuik/quik_proximity_marketing/commit/43aa0a317879bfb688e9744c37870959a482032a))
- new tp flow for qr nfc wifi ([21b88b5](https://github.com/QQuik/quik_proximity_marketing/commit/21b88b59bdb29a8742747138b3ddf19fcfbeaa45))
- now chart map can show data ([6800fcc](https://github.com/QQuik/quik_proximity_marketing/commit/6800fcc9f9cb0c7f7a64aef0174b8f919781f8e5))
- realtime data tab ([#373](https://github.com/QQuik/quik_proximity_marketing/issues/373)) ([3f8d16f](https://github.com/QQuik/quik_proximity_marketing/commit/3f8d16fc680f6d4adc6122732af35413be89f77a))
- refactor table actions ([7817055](https://github.com/QQuik/quik_proximity_marketing/commit/7817055dd1d2f135afd66a361471b4435d767b31))
- refactor URL validation and add country mapping center coordinates ([97f8a6e](https://github.com/QQuik/quik_proximity_marketing/commit/97f8a6e902a1c102ac2b8b68c4dfddbf3e042d49))
- remove app url on env ([a277b5b](https://github.com/QQuik/quik_proximity_marketing/commit/a277b5bff118b73e9de18eb0ef93559ea1dc0246))
- Remove schedule and location features, update permission handling ([ddf7c49](https://github.com/QQuik/quik_proximity_marketing/commit/ddf7c492f7d7ecc784c7c68a386caed1e48d8be6))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([79cd2e5](https://github.com/QQuik/quik_proximity_marketing/commit/79cd2e5cfbaafc36ad0d82a1bdc4a840c5286791))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([4c5cecf](https://github.com/QQuik/quik_proximity_marketing/commit/4c5cecfba646b327a6936e5ddd7f659f84a082dc))
- responsive tablet in layout + some list page ([#203](https://github.com/QQuik/quik_proximity_marketing/issues/203)) ([5f29ad9](https://github.com/QQuik/quik_proximity_marketing/commit/5f29ad94e15271f5c54a8f881d2594760931b9e3))
- set casdoor token for supabase client ([1855554](https://github.com/QQuik/quik_proximity_marketing/commit/18555541eb32b780f035d3f9a580022830486bd4))
- sidebar handle for mobile & tablet & desktop ([2a14b80](https://github.com/QQuik/quik_proximity_marketing/commit/2a14b80f73af8149fb5681c53d09b511a099c949))
- split upload logics ([943c00e](https://github.com/QQuik/quik_proximity_marketing/commit/943c00eb71f0cdb7e0f4aa4dc10d66cf5494185c))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([afb57dd](https://github.com/QQuik/quik_proximity_marketing/commit/afb57dd29b77579aae2d58b23b6cb52e1a5a6a24))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([2f8b975](https://github.com/QQuik/quik_proximity_marketing/commit/2f8b975ce1c5aaec1e058fd10496aa0d144ae53c))
- update authenticator app ([bbbcf20](https://github.com/QQuik/quik_proximity_marketing/commit/bbbcf20c493721a2e2f29a62df63428971cdf95d))
- update better ui for url verification in create tp ([1672231](https://github.com/QQuik/quik_proximity_marketing/commit/1672231f571d04720799a88cdc86fe684603c664))
- update custom domain UI & add docs to vscode ignore ([#199](https://github.com/QQuik/quik_proximity_marketing/issues/199)) ([732dfc9](https://github.com/QQuik/quik_proximity_marketing/commit/732dfc90d26c8e5a305d9c2bd589e75985e65057))
- update custom utm ([b6c19aa](https://github.com/QQuik/quik_proximity_marketing/commit/b6c19aa5cfbf8519f6b6bb039184e716e042a8fa))
- update env ([f35fa72](https://github.com/QQuik/quik_proximity_marketing/commit/f35fa729a9004f3f0607bc5258909f453e41f49f))
- update ESLint rules, enhance Next.js config, and add Docker support ([bac1548](https://github.com/QQuik/quik_proximity_marketing/commit/bac1548de7731659bba72439654e6d30557ff3fe))
- update ESLint rules, enhance Next.js config, and add Docker support ([80becff](https://github.com/QQuik/quik_proximity_marketing/commit/80becff7e71ba7d643a09b56a3af6aadcc17f434))
- update free premium for block limit ([330fdb4](https://github.com/QQuik/quik_proximity_marketing/commit/330fdb442ec0d00ae5ac51772554caf4293a0968))
- update gg auth ([4cc8cc5](https://github.com/QQuik/quik_proximity_marketing/commit/4cc8cc5e3017779bce668106bb9d5527682a8eb6))
- update integration ([4c27835](https://github.com/QQuik/quik_proximity_marketing/commit/4c278359fad4f23242bdef7e6fa8e2f822ed4917))
- update integration UI & add logger pino ([f68afd9](https://github.com/QQuik/quik_proximity_marketing/commit/f68afd9c0e01ce3822b81ceab5a5fcc6e2cd52bb))
- update limit domain ([340c818](https://github.com/QQuik/quik_proximity_marketing/commit/340c81864c392b82f90d94813a862cb5f7fa9007))
- update mail mfa ([cc4bd5b](https://github.com/QQuik/quik_proximity_marketing/commit/cc4bd5b997f6ad093bd55715d2c315e9419cb356))
- update mail mfa ([866e5a9](https://github.com/QQuik/quik_proximity_marketing/commit/866e5a932c860360b38ce72b609ae84052139483))
- update mfa ui ([98c87c2](https://github.com/QQuik/quik_proximity_marketing/commit/98c87c2622ba1fd3d42e683256a377a18dc12770))
- update plan ([fe5407d](https://github.com/QQuik/quik_proximity_marketing/commit/fe5407d4eec8a39eb4766a1111c392b80b93ca8c))
- update plan ([fd2d0d2](https://github.com/QQuik/quik_proximity_marketing/commit/fd2d0d2b2b0c6b08ed5494a68fefd5ccfd5a5854))
- update plans ([1621f35](https://github.com/QQuik/quik_proximity_marketing/commit/1621f353c5fabbf8ca5fe861ecb67d241ed0eadf))
- update plans ([8750f97](https://github.com/QQuik/quik_proximity_marketing/commit/8750f9776e990c49d8956e59a2606f640047968f))
- update redis ([a63ddca](https://github.com/QQuik/quik_proximity_marketing/commit/a63ddca09f44d485bffb219d47ece44a1e1e2b39))
- update responsive for sidebar & navbar ([192921a](https://github.com/QQuik/quik_proximity_marketing/commit/192921a5a97d580af2bf15d7a655a3ddde220232))
- update sidebar ui ([27b49dc](https://github.com/QQuik/quik_proximity_marketing/commit/27b49dc75f582ee650f1e7d4ca22eb78d2da9145))
- update ui for tp advanced settings & tp update slug ([8b84bc1](https://github.com/QQuik/quik_proximity_marketing/commit/8b84bc10abe35956aee33d59c44eb3ef71c66d1e))
- update ui version 1.0 for acquistions and hide the attribute override… ([#358](https://github.com/QQuik/quik_proximity_marketing/issues/358)) ([dc0ab5a](https://github.com/QQuik/quik_proximity_marketing/commit/dc0ab5aa43dd2ab483d99c9ffb3515988b02687a))

### 🐛 Bug Fixes

- 0.0.0.0 in redirect url ([27f786f](https://github.com/QQuik/quik_proximity_marketing/commit/27f786fe9b441d70728cb81e88b1b595d614bd32))
- 404 button ([#336](https://github.com/QQuik/quik_proximity_marketing/issues/336)) ([2989283](https://github.com/QQuik/quik_proximity_marketing/commit/29892831200c0bde453edf30d78edd03f66a96e3))
- active not make form dirty ([a3d716e](https://github.com/QQuik/quik_proximity_marketing/commit/a3d716ef6b1adfb08adf1860366c6412842a6a19))
- add cookie to i18n detection ([9702ee3](https://github.com/QQuik/quik_proximity_marketing/commit/9702ee3a94cabb745b50f8539cd0654587991cad))
- add expires time for supabase jwt ([fb3e39c](https://github.com/QQuik/quik_proximity_marketing/commit/fb3e39c2a6d66cfbbe9f8f442a7139a06b1ec063))
- add https protocol to custom domain in short link ([f5e4082](https://github.com/QQuik/quik_proximity_marketing/commit/f5e4082f2e3f638a68cbf0a9e6ecbeee469e1d76))
- add key prop to Card component to resolve React warning ([c19fe66](https://github.com/QQuik/quik_proximity_marketing/commit/c19fe6668e3347df8ac317d8c10f29acde4dc3fc))
- add plan limit & lockable section ([6d09513](https://github.com/QQuik/quik_proximity_marketing/commit/6d095136c0ec703cfa27df64f88c492a80aa2ec8))
- add ts-ignore to suppress type error in QR color options update ([4aeaf58](https://github.com/QQuik/quik_proximity_marketing/commit/4aeaf586840a9bb74a95f81847daa0caceb6811e))
- adding type button to ai optimize btn ([#407](https://github.com/QQuik/quik_proximity_marketing/issues/407)) ([8ee1ab7](https://github.com/QQuik/quik_proximity_marketing/commit/8ee1ab72cb4993aac9beea0bef4ee19a9ff8588a))
- allow empty utm id ([44025fa](https://github.com/QQuik/quik_proximity_marketing/commit/44025fa1a75ed8d59a17d0cd08c40aeae3025a63))
- analytic advanced & some error ([baba42b](https://github.com/QQuik/quik_proximity_marketing/commit/baba42b1600f6dc2c05897808875df8aafbde1fd))
- animation ([011f829](https://github.com/QQuik/quik_proximity_marketing/commit/011f8291a89408768bd2718562bd75f8e4521c24))
- api called multi times when filter by created at ([383e82d](https://github.com/QQuik/quik_proximity_marketing/commit/383e82d7710798fd76371de3632a46fab21ebf33))
- audit vulnerability ([2f95a23](https://github.com/QQuik/quik_proximity_marketing/commit/2f95a238482099e55727d361e90e355c2034206f))
- banner ([26a134c](https://github.com/QQuik/quik_proximity_marketing/commit/26a134c305cda328a22c51dcdec13b24449458ab))
- bug that cant add domains ([f047c4c](https://github.com/QQuik/quik_proximity_marketing/commit/f047c4c15295502c94058017177337fd5c0d902d))
- build error ([250fd87](https://github.com/QQuik/quik_proximity_marketing/commit/250fd87d6bafad99e2b1b47a11cbb32d6c7ad72f))
- build error by correct null check ([#369](https://github.com/QQuik/quik_proximity_marketing/issues/369)) ([5014422](https://github.com/QQuik/quik_proximity_marketing/commit/5014422e1d9f00fa06b99f3b4a4686a13897249e))
- calculate time left for first time, not wait for first interval ([1d08f07](https://github.com/QQuik/quik_proximity_marketing/commit/1d08f07da08e6751f31df86956c7eefc616f1dfe))
- cancel zalo widget ([4239217](https://github.com/QQuik/quik_proximity_marketing/commit/4239217c7c5ffa9d94d46d4a598a807a4fff5734))
- change animation navbar ([1aac6c9](https://github.com/QQuik/quik_proximity_marketing/commit/1aac6c9722fff2c2bd973885af9efb5994907fc2))
- change default qr logo and fix dayjs usage in tp list ([#480](https://github.com/QQuik/quik_proximity_marketing/issues/480)) ([801eb32](https://github.com/QQuik/quik_proximity_marketing/commit/801eb32b3ff7dda7177419d9a94f583e4053d152))
- change due to comment ([c6e8d1a](https://github.com/QQuik/quik_proximity_marketing/commit/c6e8d1a36cab0bc2e35f7880c1677b3e2323b4d2))
- change env & fix api for tags ([be08057](https://github.com/QQuik/quik_proximity_marketing/commit/be08057682be4fff39f21fde529d5d8fefcf64c9))
- change gtm to ga ([a0c62cb](https://github.com/QQuik/quik_proximity_marketing/commit/a0c62cb06112e7ab6d4b183652fda9a692fe3e10))
- change supabase from public into private ([44bec4d](https://github.com/QQuik/quik_proximity_marketing/commit/44bec4d9f1ccf1a329d14211dade3bb4a33bee36))
- **cicd:** fix semantic release ([4eeed0d](https://github.com/QQuik/quik_proximity_marketing/commit/4eeed0da39a7e0827041e5866e925c4f8c7879ab))
- **cicd:** ref=main ([8eb685a](https://github.com/QQuik/quik_proximity_marketing/commit/8eb685aa141df57e9215d005a667c0cd5586cd8a))
- **cicd:** release only on main ([ed6f583](https://github.com/QQuik/quik_proximity_marketing/commit/ed6f5831d7b82a7dc97717d5005ebbb983792888))
- clear old file ([452d97c](https://github.com/QQuik/quik_proximity_marketing/commit/452d97c7df4941f658014845968cf48a1f5b06a5))
- clear some file ([e679299](https://github.com/QQuik/quik_proximity_marketing/commit/e679299b42017eb8a8a95e5d26449a5e4367eb2c))
- conflict ([8d9c4ad](https://github.com/QQuik/quik_proximity_marketing/commit/8d9c4adc594eaaf604bccfdf08e29a527b2de5c2))
- conflict ([c525ab1](https://github.com/QQuik/quik_proximity_marketing/commit/c525ab1c2cea53fc169e797b6dd289060fb201e2))
- conflict ([e7f0b90](https://github.com/QQuik/quik_proximity_marketing/commit/e7f0b905a2abc1a0017a67dd96ef2b1f45885a65))
- conflict ([2146389](https://github.com/QQuik/quik_proximity_marketing/commit/2146389e4971c4a0e549caae05071fb00596d762))
- conflict & add module integrations ([d2a147e](https://github.com/QQuik/quik_proximity_marketing/commit/d2a147ec98255c9deb71e3b0a5f4e2bd8a2e5af9))
- cookie i18n ([9e38d7b](https://github.com/QQuik/quik_proximity_marketing/commit/9e38d7b815f7f6ebd187b780f8f1bf523f193e03))
- cookie will work after this last fix ([ce926ce](https://github.com/QQuik/quik_proximity_marketing/commit/ce926cee2078c3ae6e4dc02c17b8ca9f9dd91aac))
- copy qr on svg type ([1c25899](https://github.com/QQuik/quik_proximity_marketing/commit/1c25899e29bee1f9965cd3f3baa4925213324dab))
- correct response schema ([9684d3f](https://github.com/QQuik/quik_proximity_marketing/commit/9684d3f0373603c3727af8e96d07501c775da432))
- create tp form ([71f12f1](https://github.com/QQuik/quik_proximity_marketing/commit/71f12f1d6553829754c6adccab186927ca87d2bb))
- created_at filter not work ([58c42ce](https://github.com/QQuik/quik_proximity_marketing/commit/58c42cefefa9ddde094599da51b97f754836d0e3))
- dashboard crash by data undifined ([08c3110](https://github.com/QQuik/quik_proximity_marketing/commit/08c31101564785ae7385df4acfd0ed6b54a0afab))
- db-type ([338354a](https://github.com/QQuik/quik_proximity_marketing/commit/338354a106f0df0ed990cdee1c6a4fa1bb5f8fdd))
- deselect when change campaign in analytics page ([acfb11d](https://github.com/QQuik/quik_proximity_marketing/commit/acfb11d4337c3af89879e36d6d5dc5837f761f82))
- dialog break dom ([2bdd21a](https://github.com/QQuik/quik_proximity_marketing/commit/2bdd21aa234034cfd9ff500bb304d37a53bf74a5))
- docker compose ([0a36a09](https://github.com/QQuik/quik_proximity_marketing/commit/0a36a090e1187b58f378e835541a1e0cea7cc9f4))
- dockerfile for node-canvas ([c59ca22](https://github.com/QQuik/quik_proximity_marketing/commit/c59ca228a4fbb7a1f7ff830c7af2267fdb923c3e))
- domain not have https ([e6e973e](https://github.com/QQuik/quik_proximity_marketing/commit/e6e973e29ff3a757830a3ec5062a0c9c22626dc1))
- duplicate create access token ([e447040](https://github.com/QQuik/quik_proximity_marketing/commit/e4470401982e919515eb8c8f55a0923c6f1b7601))
- empty response message ([1c21bc8](https://github.com/QQuik/quik_proximity_marketing/commit/1c21bc8962c0b57adcebb8d04ddb8305dd2efbfe))
- Enhance form validation and empty section component with better UI/UX ([4736533](https://github.com/QQuik/quik_proximity_marketing/commit/47365339b2f4cdad8ba12372c511637b64f0c4c5))
- ensure cookies are always deleted regardless of domain during logout ([1559620](https://github.com/QQuik/quik_proximity_marketing/commit/155962076fdefeb87a60cc0a645163570aeab831))
- env change to work on client side ([953dc4b](https://github.com/QQuik/quik_proximity_marketing/commit/953dc4bdcc18893a95b76f1a2575ecd01466039c))
- env de ([6f365ca](https://github.com/QQuik/quik_proximity_marketing/commit/6f365caebb0b7d80dec84ff0289e8a3da0cc22bf))
- env local ([dc6c5c8](https://github.com/QQuik/quik_proximity_marketing/commit/dc6c5c864ae2d1eb4f9ae0dfe79bddc7f652d779))
- error on tree select ([9c2c974](https://github.com/QQuik/quik_proximity_marketing/commit/9c2c9748cdc00533f2e9f9957e5dbe6514466a5b))
- error that make free user can edit metatags ([850d0a8](https://github.com/QQuik/quik_proximity_marketing/commit/850d0a84e8ecfb96dacad6018f9289fe24eabff6))
- error ts ([583e937](https://github.com/QQuik/quik_proximity_marketing/commit/583e9376bfd511556a7e5eb0f5ca151ee3bea371))
- error when backing on proxify ([a52ac8f](https://github.com/QQuik/quik_proximity_marketing/commit/a52ac8f151a84c65d17629a61ffea3bbbd19e3e0))
- error when null data ([#371](https://github.com/QQuik/quik_proximity_marketing/issues/371)) ([8a3e97d](https://github.com/QQuik/quik_proximity_marketing/commit/8a3e97d1e7f5b3ce908c742abf9d70bc698ac91b))
- error" ([e22b124](https://github.com/QQuik/quik_proximity_marketing/commit/e22b1242acdb3a8d26b2ca8a4d7d87d922488403))
- error" ([c9f1f01](https://github.com/QQuik/quik_proximity_marketing/commit/c9f1f0102313db7f5270d38ce1cf2facac48f956))
- filter time error on tp analytics ([5f5319f](https://github.com/QQuik/quik_proximity_marketing/commit/5f5319fafb03ed55495d9cf6c828d1cc6b108938))
- fix banner ([5c474c1](https://github.com/QQuik/quik_proximity_marketing/commit/5c474c1995cf5f217f5e0ead2df57ed2c8fbac1f))
- fix bug mfa ([f273182](https://github.com/QQuik/quik_proximity_marketing/commit/f2731823600d31a0e1a26d3abdaba65f199b05ba))
- fix cicd & releaserc ([2882c87](https://github.com/QQuik/quik_proximity_marketing/commit/2882c87342b4c7bf3ae0ca19427ea0dc8322006e))
- fix env ([0d2e41e](https://github.com/QQuik/quik_proximity_marketing/commit/0d2e41e9994f04cc11b63b0e2f6ab3276d1cf2be))
- fix error when null data fetching ([#370](https://github.com/QQuik/quik_proximity_marketing/issues/370)) ([2ef0f8b](https://github.com/QQuik/quik_proximity_marketing/commit/2ef0f8b66716fa8c7f911780db66840861f0b35e))
- fix key mail ([7a0e9e1](https://github.com/QQuik/quik_proximity_marketing/commit/7a0e9e1dd35a7f6edaabcdf14df98c41ada863ec))
- fix mail ([e18d9e2](https://github.com/QQuik/quik_proximity_marketing/commit/e18d9e2181e9fc095879d56a5ca627562e903457))
- fix metatag & utm tag logic ([48a10a8](https://github.com/QQuik/quik_proximity_marketing/commit/48a10a8bf3c4420075360290738460d35f145953))
- fix mfa ([4cc228f](https://github.com/QQuik/quik_proximity_marketing/commit/4cc228f163f467ae29d8733965e00ee7eed676ac))
- fix utm tags ([78a7919](https://github.com/QQuik/quik_proximity_marketing/commit/78a79192f3bff84c4c5198a7b42735ffc85a1722))
- force push when delete touch point ([4e6ec24](https://github.com/QQuik/quik_proximity_marketing/commit/4e6ec24306f21821c30ffbd6edabf6156a7f2830))
- force push when delete touch point ([9a16ac6](https://github.com/QQuik/quik_proximity_marketing/commit/9a16ac639e8f4714e1a21edceeee1505a09b8663))
- form not change state when upload image ([751331a](https://github.com/QQuik/quik_proximity_marketing/commit/751331a1584dfdb4291d3e108d4ebfb84977c55a))
- format error ([366fb89](https://github.com/QQuik/quik_proximity_marketing/commit/366fb89b1944ac38f8918584326b65dab62984d8))
- GTM ID regex ([2ea0a3b](https://github.com/QQuik/quik_proximity_marketing/commit/2ea0a3b4b193013d5b4083343a1c46b586c36b4d))
- handle cookie domain for production environment in auth routes ([f7b1aaa](https://github.com/QQuik/quik_proximity_marketing/commit/f7b1aaa85a7cb57960395a290679b5ae6fee6aed))
- handle null createdTpId in rollback and improve type safety ([2c15143](https://github.com/QQuik/quik_proximity_marketing/commit/2c15143a3c35927f816fead761db75105c7bab92))
- heatmap hover ([f1cbdb2](https://github.com/QQuik/quik_proximity_marketing/commit/f1cbdb2c1ed163037731d9071f623c2ac3bb661a))
- heatmap wrong color ([59840c7](https://github.com/QQuik/quik_proximity_marketing/commit/59840c718f788f354f21562f2548f27e20f3d655))
- hide performance overview + back btn in tp detail ([63ec355](https://github.com/QQuik/quik_proximity_marketing/commit/63ec355645f08c5c19456fffd33c61fcdc818750))
- hot fix table rows ([ddc4500](https://github.com/QQuik/quik_proximity_marketing/commit/ddc4500a799a68adc5f592202d4fda06fa55c085))
- hot fixx ([5594f85](https://github.com/QQuik/quik_proximity_marketing/commit/5594f854bc973a37475f4603917e7fbb058f5bf0))
- i18n cookie ([3e3f0f2](https://github.com/QQuik/quik_proximity_marketing/commit/3e3f0f21e42fb4faa885abc78caaf88e0411c104))
- import error ([cc85aa3](https://github.com/QQuik/quik_proximity_marketing/commit/cc85aa32ffcb7d37e1f978435f1ae81bf52d26f9))
- import error ([fe66bc5](https://github.com/QQuik/quik_proximity_marketing/commit/fe66bc5d041d162a4d6041ddccdbc095742191e6))
- include 403 status in token refresh interceptor logic ([db1f155](https://github.com/QQuik/quik_proximity_marketing/commit/db1f1558323eaed7f92d899fd21600afd2da5892))
- initial value error ([822e7fc](https://github.com/QQuik/quik_proximity_marketing/commit/822e7fc8400a83ed4f27ba10f2c75c8d348ca7be))
- layout ([5b641a3](https://github.com/QQuik/quik_proximity_marketing/commit/5b641a3eb41c2f7b45ce4a972b2a74617d7970a7))
- layout ([c9c6904](https://github.com/QQuik/quik_proximity_marketing/commit/c9c6904b482750c51dcf8721b7d93d8eeae52756))
- loading org not work ([f42c7b3](https://github.com/QQuik/quik_proximity_marketing/commit/f42c7b32ebd301c4141086a5e3d7fa07e4363e2f))
- loading state on i18n ([de41769](https://github.com/QQuik/quik_proximity_marketing/commit/de4176957f34fbf38a0110c2718ff0acdfd99e85))
- lockable section error ([8589b6d](https://github.com/QQuik/quik_proximity_marketing/commit/8589b6d11927b921c0786958a08cc5305ede2f10))
- make sidebar default show ([87b2f22](https://github.com/QQuik/quik_proximity_marketing/commit/87b2f22066eee9462043c6678623ea04d8e9dca8))
- make sidebar smooth when change from desktop to tablet ([b11da70](https://github.com/QQuik/quik_proximity_marketing/commit/b11da708783cd5a2f2d5205ab6b420ca2e397bcb))
- mapping country not work ([88ed73f](https://github.com/QQuik/quik_proximity_marketing/commit/88ed73ff9e2ae6659bc1ff28f85cdb5711fb1ac4))
- merge error ([b347f42](https://github.com/QQuik/quik_proximity_marketing/commit/b347f425299fea668779b7ffcdba789767919e1d))
- metatag error ([7dbb596](https://github.com/QQuik/quik_proximity_marketing/commit/7dbb596a1fbfb6469d588e5b8af1424b1a7713ac))
- middleware error ([41398e2](https://github.com/QQuik/quik_proximity_marketing/commit/41398e2b69e48e590d00a8e21c7abf9c9d5a3645))
- middleware for public page ([b00ab17](https://github.com/QQuik/quik_proximity_marketing/commit/b00ab170f6036f4bccb51f60d0fe4aac98fff736))
- not refresh user plan after create org ([9801c71](https://github.com/QQuik/quik_proximity_marketing/commit/9801c71c4915bf8e78b59419680658b604298f3b))
- only send mail if result success is true ([fcf91a0](https://github.com/QQuik/quik_proximity_marketing/commit/fcf91a076e4c62a1500e0df031e2d703c37dcc83))
- parcel err ([25d6d5b](https://github.com/QQuik/quik_proximity_marketing/commit/25d6d5b8e42fd9bddbfbccd17e31386afaa273ce))
- parcelvoy ([3da54cf](https://github.com/QQuik/quik_proximity_marketing/commit/3da54cfc5f5c203101c34b772f3267fbd384bde2))
- parcelvoy docs url ([0c73df9](https://github.com/QQuik/quik_proximity_marketing/commit/0c73df9a82beb71c5fd57b2e469f73e2c8e64353))
- parcelvoy tp blocked ([b0d6f19](https://github.com/QQuik/quik_proximity_marketing/commit/b0d6f194fad745ecf90252cab704126e7da313f1))
- performance issue on i18n ([30d6830](https://github.com/QQuik/quik_proximity_marketing/commit/30d683075e72ae32098c6ed47e3223d417d3a228))
- plan cache not clear when create org ([6fd6fb8](https://github.com/QQuik/quik_proximity_marketing/commit/6fd6fb8d980b7acc683b466c7ed87f84820387ce))
- plan check for create tp anon ([a5c37f0](https://github.com/QQuik/quik_proximity_marketing/commit/a5c37f005da0198b43ebb7184fd0df703994f605))
- profile service ([#390](https://github.com/QQuik/quik_proximity_marketing/issues/390)) ([8c4bcba](https://github.com/QQuik/quik_proximity_marketing/commit/8c4bcba273ea35c8c966696b70efc57d52327520))
- public files ([899e39b](https://github.com/QQuik/quik_proximity_marketing/commit/899e39b5c21e6a1e4606af2a9df21d899c7fe6f5))
- qr link ([d4ff6a9](https://github.com/QQuik/quik_proximity_marketing/commit/d4ff6a909535245a5cf981cce33a6a683637b8c9))
- qr spam update in tp update page ([326d38a](https://github.com/QQuik/quik_proximity_marketing/commit/326d38ae54b9534664e9e554bbec824317581fe6))
- qr-customize-in-app-load-wrong-options by remove hard code color ([#417](https://github.com/QQuik/quik_proximity_marketing/issues/417)) ([4f1c5a5](https://github.com/QQuik/quik_proximity_marketing/commit/4f1c5a58f305e4878ea8f8b3b653e0e32fd76e6b))
- querykey tag detail ([#457](https://github.com/QQuik/quik_proximity_marketing/issues/457)) ([3478fd2](https://github.com/QQuik/quik_proximity_marketing/commit/3478fd23ab77b5c7c832c69c67c0c7b6122ca3a5))
- reduce use effect qr render ([#427](https://github.com/QQuik/quik_proximity_marketing/issues/427)) ([ad7d397](https://github.com/QQuik/quik_proximity_marketing/commit/ad7d3976ddbb70d99fad6b345bdf2a7274b23e5c))
- referrer chart display and display top 5 most visit when hover ([a709115](https://github.com/QQuik/quik_proximity_marketing/commit/a7091151ab0902eed8585bf1bd22915b1a9c8fa5))
- refresh token error ([4284e2c](https://github.com/QQuik/quik_proximity_marketing/commit/4284e2ce41da3965a80ebc5fb131f7e8a39965ab))
- refresh token make duplicate cookie ([a7a8b65](https://github.com/QQuik/quik_proximity_marketing/commit/a7a8b653cbe06bd1c33f5c958ccb6be4417055a9))
- regex for block ip address ([7124105](https://github.com/QQuik/quik_proximity_marketing/commit/712410507a1a8ff77ee01676dfa3d870cac41ff8))
- regex for block ip address ([055bcfb](https://github.com/QQuik/quik_proximity_marketing/commit/055bcfbe0f70e2db7861c5cd80b9aee43726737f))
- remove bg for loading screen ([26e8b90](https://github.com/QQuik/quik_proximity_marketing/commit/26e8b90a8a0a39a13a399af153059c472adce2a6))
- remove code test ([89f97c5](https://github.com/QQuik/quik_proximity_marketing/commit/89f97c5a902a92884cd1b25880dfc4edec917240))
- remove eval for security ([#464](https://github.com/QQuik/quik_proximity_marketing/issues/464)) ([d450cd9](https://github.com/QQuik/quik_proximity_marketing/commit/d450cd91385600dc31e1e523c55a741b4a6a0153))
- remove old file ([80723e0](https://github.com/QQuik/quik_proximity_marketing/commit/80723e0bb159749a06acd89f010e3815d2753f0e))
- remove provider in others layout ([e1f5b56](https://github.com/QQuik/quik_proximity_marketing/commit/e1f5b56964ac83f6f8cbca62b9e9c24870c66b68))
- remove react context ([9748616](https://github.com/QQuik/quik_proximity_marketing/commit/9748616ea8956b1bee29ca89cbda6cfc5207ca17))
- remove test code ([d66d361](https://github.com/QQuik/quik_proximity_marketing/commit/d66d361725f40824ba412d79d2ce4025a66d56a2))
- remove webp on metatag image ([88f0a1e](https://github.com/QQuik/quik_proximity_marketing/commit/88f0a1e95a73911f786b65819def2d47c7063892))
- responsive in mobile devices ([b7ac32a](https://github.com/QQuik/quik_proximity_marketing/commit/b7ac32a105bb51b205cffc41117f1dc5cacf44be))
- revert limit ([914e537](https://github.com/QQuik/quik_proximity_marketing/commit/914e537d7dcf0dbba34207a5aa346a690e60a8fc))
- sameSite = None & log for cookie ([9f63085](https://github.com/QQuik/quik_proximity_marketing/commit/9f63085e079c118e5269e1a6fff81b67d19b239c))
- scroll for home page ([98c4336](https://github.com/QQuik/quik_proximity_marketing/commit/98c433601380418388c4c23e9a423bbc5a55dab0))
- show full QR customization form when QR code is dirty ([61ffd42](https://github.com/QQuik/quik_proximity_marketing/commit/61ffd42b26fcab5c6e9c79adf5759a88180c6d97))
- show login call2action when user not logged in ([24d3906](https://github.com/QQuik/quik_proximity_marketing/commit/24d3906096c5daea9a086a96b7011e7ddbd206e7))
- skip domain-based cookie deletion in development environment ([9ade6e7](https://github.com/QQuik/quik_proximity_marketing/commit/9ade6e78debe184cd070c712cccdb4ce7db7287b))
- suspense on acquisitions tab ([62df083](https://github.com/QQuik/quik_proximity_marketing/commit/62df08367024bc69cefd1d94304753afd30a6a35))
- tag errors ([603b7e5](https://github.com/QQuik/quik_proximity_marketing/commit/603b7e5ecd3f93ef0b42a12219677c2ca92939c4))
- tags error on macos ([403fab6](https://github.com/QQuik/quik_proximity_marketing/commit/403fab61462f8b230aa7dd373b7c186ac7f9c1a5))
- test deploy ([a5ed4d2](https://github.com/QQuik/quik_proximity_marketing/commit/a5ed4d28fe15be1e3e4af23b2611d5ee038bd490))
- tp form dirty handle ([783c14d](https://github.com/QQuik/quik_proximity_marketing/commit/783c14d2174a742cb9794d462cb2826aee381e84))
- tp logic ([83ae675](https://github.com/QQuik/quik_proximity_marketing/commit/83ae675795b6834b2fc21f93a3ce708dfd08882e))
- try to fix cookie ([ed8d035](https://github.com/QQuik/quik_proximity_marketing/commit/ed8d0354dbeac238620a1de943161451ddb93bee))
- try to fix i18n cookie not set on root domain ([c775589](https://github.com/QQuik/quik_proximity_marketing/commit/c775589ae550a5af61177dc71ff67efe4e700d49))
- ts err ([f41d7bf](https://github.com/QQuik/quik_proximity_marketing/commit/f41d7bfafc527c94d7e9b89088cee99f37ee3b62))
- ts error on blob type ([38c4a60](https://github.com/QQuik/quik_proximity_marketing/commit/38c4a60d085525a8e237330f3f9bb81ab10c05dd))
- type error ([4806593](https://github.com/QQuik/quik_proximity_marketing/commit/48065938e5ac63963d4d3fa529e06b7c54c0d0b6))
- typescript ([af8887b](https://github.com/QQuik/quik_proximity_marketing/commit/af8887b694f285e3ecc48a8d053594746ea4f4cf))
- typescript error ([abec86b](https://github.com/QQuik/quik_proximity_marketing/commit/abec86b8eb6d38108b7d92c4ed29f8de487b6d59))
- typescript error ([cd71385](https://github.com/QQuik/quik_proximity_marketing/commit/cd7138574cf68bb9f68493011f89f4fd4069c35b))
- typescript error on blob type ([deea737](https://github.com/QQuik/quik_proximity_marketing/commit/deea7374861286cf4433bcf4a1f568de34ea2026))
- typo error in shlink api path ([0c98397](https://github.com/QQuik/quik_proximity_marketing/commit/0c983970e0320de3e19fe01e35cf899d7125b019))
- ui freeze on popover ([e485e3e](https://github.com/QQuik/quik_proximity_marketing/commit/e485e3ecb57589a1b9c0f3090abe1c9d44b60371))
- ui responsive ([f8875ee](https://github.com/QQuik/quik_proximity_marketing/commit/f8875ee84734d466b8854e0a6c67b52ff09e9826))
- ui update for dashboard ([4f3498a](https://github.com/QQuik/quik_proximity_marketing/commit/4f3498a901156457b15cbd435f3fa788c1c607d0))
- update code ([fe8a881](https://github.com/QQuik/quik_proximity_marketing/commit/fe8a881ca27dfe08b9647b8c41b0e1d72f5bf25c))
- update content ([bb65f6a](https://github.com/QQuik/quik_proximity_marketing/commit/bb65f6a6af93d72bc21cf985c0970377cb695772))
- update db payment ([074e00b](https://github.com/QQuik/quik_proximity_marketing/commit/074e00bb14281198ccbf547e5165f046e6dcadc3))
- update dependabot config to use npm instead of yarn package ecosystem ([62bc715](https://github.com/QQuik/quik_proximity_marketing/commit/62bc715b3f2ea7034dba21e86d9e699a8df9f7c8))
- update Docker dependencies for node-canvas and add ts-ignore comments for type safety ([a93fe19](https://github.com/QQuik/quik_proximity_marketing/commit/a93fe1926648a428f30ea644eeffe9b5cb0af986))
- update Dockerfile to properly install node-canvas dependencies in base image ([8587468](https://github.com/QQuik/quik_proximity_marketing/commit/858746885afb35fec2006d3a5befa2703d4f5fb0))
- update env ([1212b82](https://github.com/QQuik/quik_proximity_marketing/commit/1212b82e6c7c77916675f42262ccc8229fd9e5c3))
- update mail queue ([4f2b81c](https://github.com/QQuik/quik_proximity_marketing/commit/4f2b81c1c2b900fdc5a1e2fa1bc7d1304ceeeaa7))
- update SameSite cookie attribute from None to Lax for auth tokens ([09edd47](https://github.com/QQuik/quik_proximity_marketing/commit/09edd4756335045ad09096c30f7ab60d887d9ae3))
- update short_url to use environment variable for base URL ([ac0dfe2](https://github.com/QQuik/quik_proximity_marketing/commit/ac0dfe220b3825d17775ff704069d39a53202eaf))
- update to using app error and check empty in advanced analytic ([#386](https://github.com/QQuik/quik_proximity_marketing/issues/386)) ([1dcf292](https://github.com/QQuik/quik_proximity_marketing/commit/1dcf2926f35abead1f14723d2a2ad7be203d825e))
- url for invitation when accept ([033e6b4](https://github.com/QQuik/quik_proximity_marketing/commit/033e6b4add88c50b6568b7971478883af0e91597))
- use full domain with shortcode instead of shortUrl for QR code generation ([24c8a9f](https://github.com/QQuik/quik_proximity_marketing/commit/24c8a9fe1360df32f4a2c7d3e5b0318ee7bddd94))
- use QR customization options from created touch point instead of default options ([bd816a2](https://github.com/QQuik/quik_proximity_marketing/commit/bd816a298a75493a567a4a0004f5d55e81a6d9da))
- using session to get user in update Profile and remove console… ([#389](https://github.com/QQuik/quik_proximity_marketing/issues/389)) ([e0b20c2](https://github.com/QQuik/quik_proximity_marketing/commit/e0b20c26da9438bdf6784b21462d7f002440c502))
- workflow ([e21d618](https://github.com/QQuik/quik_proximity_marketing/commit/e21d6180a98b5a4493efb0613aadd86108cff7b0))
- workflow to correct branch ([0eb8500](https://github.com/QQuik/quik_proximity_marketing/commit/0eb8500a88b4dd199dee68cb553207826b440a94))
- wrap ArrayBuffer in Uint8Array when creating Blob/File for QR code images ([cfccb09](https://github.com/QQuik/quik_proximity_marketing/commit/cfccb09cad9767c3b30947a23a4e5cd6c552d1b5))
- wrapped useCallback for window.location.href to prevent auto load in build stage ([ce9d44d](https://github.com/QQuik/quik_proximity_marketing/commit/ce9d44da6b4066eb3ab64d5d43b487067c8cc5e9))
- wrong logic when add tp into tag ([7af645f](https://github.com/QQuik/quik_proximity_marketing/commit/7af645f1eef7bab343e0d20fe85d98bd0b32d294))
- yarn build error ([52c7885](https://github.com/QQuik/quik_proximity_marketing/commit/52c78855ef687f61dd4db44afef79d0bda021b24))

### 🛠 Updates

- add api call for acquistion ([#361](https://github.com/QQuik/quik_proximity_marketing/issues/361)) ([91adbfc](https://github.com/QQuik/quik_proximity_marketing/commit/91adbfcbad43dc55de85ea3fa35a54c2350afcea))
- add copy btn in qr result ([e9ca6b0](https://github.com/QQuik/quik_proximity_marketing/commit/e9ca6b0889fc63d4a6f5541c889d3a515e64ac65))
- add dbtypes ([57021a9](https://github.com/QQuik/quik_proximity_marketing/commit/57021a91bfb3b1d5a12b6250148a82b8a62db556))
- Add invitation detail component with accept/decline functionality ([7e8f25e](https://github.com/QQuik/quik_proximity_marketing/commit/7e8f25eab94cb2c684331c6a77730ad75e94f07c))
- add link into tp name ([e015e9a](https://github.com/QQuik/quik_proximity_marketing/commit/e015e9a88f8ef84bd377f2ce5cff0a7af1e35944))
- add meta page name as fallback of title ([790a772](https://github.com/QQuik/quik_proximity_marketing/commit/790a7722af3e639b3f8eb1fc57538a70784388cd))
- add placeholder for referrer chart ([25374a3](https://github.com/QQuik/quik_proximity_marketing/commit/25374a3d112a710567849af85bb2f70a8a8bfd87))
- add plan limit check for max members and fix tag count validation timing ([7ab996e](https://github.com/QQuik/quik_proximity_marketing/commit/7ab996e2cb9fa63303f8495d066ba3667b546053))
- add processing time to logs ([24c35f1](https://github.com/QQuik/quik_proximity_marketing/commit/24c35f112b6d30950725737e342a6a22ad49c5b7))
- add skeleton when loading & modify campaign update logic ([b81e2f7](https://github.com/QQuik/quik_proximity_marketing/commit/b81e2f787c9c30d44b1bf217f7201e9cd02372d9))
- add some test case ([f133e7f](https://github.com/QQuik/quik_proximity_marketing/commit/f133e7f492b70028ddf9f5a1e9e4829873fcf5cb))
- add supabase url into images nextconfig ([2f0c511](https://github.com/QQuik/quik_proximity_marketing/commit/2f0c51151507d79e1be002d5dbca290ba495729f))
- add touch point component & logic ([ada9ada](https://github.com/QQuik/quik_proximity_marketing/commit/ada9ada035a99d966499d031bc92249239bd6158))
- adding asset selected to touch point ([84cb9ae](https://github.com/QQuik/quik_proximity_marketing/commit/84cb9ae94ab24da99e4a877e66225b116abba5f4))
- adding asset selected to touch point ([df5a4a3](https://github.com/QQuik/quik_proximity_marketing/commit/df5a4a35a97f664ebced7d266a28751f9e23c10a))
- adding asset selected to touch point ([632a244](https://github.com/QQuik/quik_proximity_marketing/commit/632a2444d16b4b6c1e143755a8e1a0aea205de59))
- adding feature export tp file ([#418](https://github.com/QQuik/quik_proximity_marketing/issues/418)) ([c8068df](https://github.com/QQuik/quik_proximity_marketing/commit/c8068df90ac147c53586b51b2e1677249b93a269))
- adding GA and Mautic Tracking ([9d9b156](https://github.com/QQuik/quik_proximity_marketing/commit/9d9b1568fb4dd17bf00ff99a1be41864e0b945bd))
- adding landing page ([8d6ce46](https://github.com/QQuik/quik_proximity_marketing/commit/8d6ce460537161b7a66a2da986d8a2e81682e479))
- adding loading button ([09ee871](https://github.com/QQuik/quik_proximity_marketing/commit/09ee8716b6e7ab9c571b3fd2e89975327c6891b8))
- adding null check for some maps and remove Empty section, change it to null instead for reduce misunderstanding, apply tabs for Audience ([#366](https://github.com/QQuik/quik_proximity_marketing/issues/366)) ([cb0bf5f](https://github.com/QQuik/quik_proximity_marketing/commit/cb0bf5f84dad03fb24e7733dc1eb319817d8f162))
- adding null check for tabs ([#368](https://github.com/QQuik/quik_proximity_marketing/issues/368)) ([d894cd2](https://github.com/QQuik/quik_proximity_marketing/commit/d894cd265a3b5d1a2cb20f81e00b39ba661e9147))
- Adding placholder for empty data chart ([#372](https://github.com/QQuik/quik_proximity_marketing/issues/372)) ([9834143](https://github.com/QQuik/quik_proximity_marketing/commit/983414350dd696c641e3d5d0e4613fdb56f92f3c))
- adding time expired at ([#262](https://github.com/QQuik/quik_proximity_marketing/issues/262)) ([d48f979](https://github.com/QQuik/quik_proximity_marketing/commit/d48f979cafdc387060426106c636b078c9d6ee0f))
- adding toggle langua + interaction slide ([a53c7e1](https://github.com/QQuik/quik_proximity_marketing/commit/a53c7e159aace125855d16420e889a2f60a6dd1d))
- adding zod translation ([#382](https://github.com/QQuik/quik_proximity_marketing/issues/382)) ([9d3caab](https://github.com/QQuik/quik_proximity_marketing/commit/9d3caabb43c12c82796f35a72fe9e1a58c34ccf8))
- adjust clean code" ([8541ebc](https://github.com/QQuik/quik_proximity_marketing/commit/8541ebc30790e13aac93d73e21b25b8978b02898))
- adjust clean code" ([34ded72](https://github.com/QQuik/quik_proximity_marketing/commit/34ded7273abce9e1968e6e695afde072233521e6))
- adjust to UI design v1.1 ([9589769](https://github.com/QQuik/quik_proximity_marketing/commit/9589769798676198f8482772864fd78db4ca105a))
- adjust ui ([8668039](https://github.com/QQuik/quik_proximity_marketing/commit/86680391bdf522e8423ba53f9f947c0286e1f4bb))
- adjust UI ([9ce227f](https://github.com/QQuik/quik_proximity_marketing/commit/9ce227fad97f691d8e34e01d35631c4cb8d40a8b))
- adjust UI ([bd995d2](https://github.com/QQuik/quik_proximity_marketing/commit/bd995d239778172869be39298a84d5f2042e015d))
- adjust using dangerous ([724fdc9](https://github.com/QQuik/quik_proximity_marketing/commit/724fdc95f68ddf828d60cde4bd038546179445a1))
- advanced analytic UI v0.1 ([#352](https://github.com/QQuik/quik_proximity_marketing/issues/352)) ([17d935f](https://github.com/QQuik/quik_proximity_marketing/commit/17d935f214f37653c025932630ec9446222428ea))
- advanced analytic UI v0.2 ([#353](https://github.com/QQuik/quik_proximity_marketing/issues/353)) ([687c942](https://github.com/QQuik/quik_proximity_marketing/commit/687c9421088fa9a0af7393b0db2b72369a96191e))
- ai slug UI v2.1 ([#412](https://github.com/QQuik/quik_proximity_marketing/issues/412)) ([aa2b1a7](https://github.com/QQuik/quik_proximity_marketing/commit/aa2b1a7642c805088b9c6d3322035afff9a7f165))
- ai UI slug with design ([#408](https://github.com/QQuik/quik_proximity_marketing/issues/408)) ([8f4a6ff](https://github.com/QQuik/quik_proximity_marketing/commit/8f4a6ff056cb72c491f9608f4b1a89586361d55c))
- analytic page ([aaf186a](https://github.com/QQuik/quik_proximity_marketing/commit/aaf186a7097e17a988456185d273888db1851aee))
- analytic page ([b661305](https://github.com/QQuik/quik_proximity_marketing/commit/b6613051819219370fdd4457376d297bde1d7874))
- animation landingpage ([3264136](https://github.com/QQuik/quik_proximity_marketing/commit/3264136765727fa4214ebb73d38d0edad75be19e))
- app sidebar v0.1 ([#425](https://github.com/QQuik/quik_proximity_marketing/issues/425)) ([6217700](https://github.com/QQuik/quik_proximity_marketing/commit/621770089b2af28a9018c807d01eab70e2f10094))
- arrow back and log out button ([#415](https://github.com/QQuik/quik_proximity_marketing/issues/415)) ([636b926](https://github.com/QQuik/quik_proximity_marketing/commit/636b92689e34c0c77a7321d3e281ae92a08f79f8))
- auto switch tab to qr code if generate by create qr code ([#463](https://github.com/QQuik/quik_proximity_marketing/issues/463)) ([e65bea3](https://github.com/QQuik/quik_proximity_marketing/commit/e65bea3aa8ad5e0794da64fed6dd57d0ed91d99c))
- change default options of qr to match with qr in landing page ([#413](https://github.com/QQuik/quik_proximity_marketing/issues/413)) ([519ca2b](https://github.com/QQuik/quik_proximity_marketing/commit/519ca2b885f0e6d28005a6b904fb6925ec0de7db))
- change default url ([#474](https://github.com/QQuik/quik_proximity_marketing/issues/474)) ([2cb735f](https://github.com/QQuik/quik_proximity_marketing/commit/2cb735f46f01adb61bcb02ba6fdbacf73adc52a7))
- change img and content layout ([00b6a68](https://github.com/QQuik/quik_proximity_marketing/commit/00b6a68bf72d297c0233d53ad743d2771b71f4f2))
- change li2con from png to svg ([#340](https://github.com/QQuik/quik_proximity_marketing/issues/340)) ([0349e3e](https://github.com/QQuik/quik_proximity_marketing/commit/0349e3ec84dcc40e268ee74d44f7493860830c2e))
- change logic of validate desination ([dbf3e00](https://github.com/QQuik/quik_proximity_marketing/commit/dbf3e006545fcdd541718b6be4006edf7ce6e04b))
- change password in profile tab ([7dbda80](https://github.com/QQuik/quik_proximity_marketing/commit/7dbda8073a57d8c2433a42521fe72184f6a01f30))
- change some component from client to server ([03e1f01](https://github.com/QQuik/quik_proximity_marketing/commit/03e1f0181d94e80f6b344f80ab4e9bf3351e468c))
- change text top performing and rename file ([#342](https://github.com/QQuik/quik_proximity_marketing/issues/342)) ([2a01c43](https://github.com/QQuik/quik_proximity_marketing/commit/2a01c4393bc010a80170f696c3110b1abde3d774))
- change to new casdoor server & move cert to .env ([a6d5ea6](https://github.com/QQuik/quik_proximity_marketing/commit/a6d5ea6a617902d4081aaf727fb0af45d5f160b6))
- change to popover for download qr ([ca0df39](https://github.com/QQuik/quik_proximity_marketing/commit/ca0df39409885b700ebb0c13d1d3fdb895f6f0c9))
- change toaster to sooner ([5107646](https://github.com/QQuik/quik_proximity_marketing/commit/51076461d4e32a0175664c76cae75ea6f021d819))
- cicd ([3453d4c](https://github.com/QQuik/quik_proximity_marketing/commit/3453d4c87a8debc140fc7b24913d7b5bd18676fc))
- cicd ([53a291a](https://github.com/QQuik/quik_proximity_marketing/commit/53a291aceae6ff45ae9196fdd776f33695073aa6))
- code syntax ([#465](https://github.com/QQuik/quik_proximity_marketing/issues/465)) ([80ab7ad](https://github.com/QQuik/quik_proximity_marketing/commit/80ab7ad4b1c330014df668da3e66d192eecdd637))
- column is_warranty to asset ([3172239](https://github.com/QQuik/quik_proximity_marketing/commit/3172239045284d9e8efccf2bea08639ee71e4df2))
- create tp with advance custom customize ([#454](https://github.com/QQuik/quik_proximity_marketing/issues/454)) ([f34dee4](https://github.com/QQuik/quik_proximity_marketing/commit/f34dee43ec5577e65aecd6a09b80bf13ccc3b34d))
- dashboard ([a46633d](https://github.com/QQuik/quik_proximity_marketing/commit/a46633d23e54cedf0ca3ba5c4bd712ba22efad5f))
- dashboard new UI ([#429](https://github.com/QQuik/quik_proximity_marketing/issues/429)) ([3fac90a](https://github.com/QQuik/quik_proximity_marketing/commit/3fac90a92fd1224c33cb36b41eab37afb28b79e1))
- database-types ([9383143](https://github.com/QQuik/quik_proximity_marketing/commit/938314341672c9e66bc6bede008ca98bc3bb72d1))
- db types ([5b0f6bc](https://github.com/QQuik/quik_proximity_marketing/commit/5b0f6bc46a9548a864a5271d35ed175e45f8e1b1))
- deploy .yml and encode .env ([b4aad40](https://github.com/QQuik/quik_proximity_marketing/commit/b4aad4021634fc39f15647ef625f9ca0099091ad))
- disable touchpoint edit when campaign is disabled ([e32bcb8](https://github.com/QQuik/quik_proximity_marketing/commit/e32bcb8f3e4b04c477e60742574aea58ab12046e))
- display one month selection for mobile calendar ([#341](https://github.com/QQuik/quik_proximity_marketing/issues/341)) ([ba22f30](https://github.com/QQuik/quik_proximity_marketing/commit/ba22f30d46cc0a9f1bf4831937c3f7f2f599454c))
- docker compose ([fa49500](https://github.com/QQuik/quik_proximity_marketing/commit/fa495006f900801017992fde63ea2f72cc07c7b4))
- dummy push ([4290a1c](https://github.com/QQuik/quik_proximity_marketing/commit/4290a1c0fdcbaecf559626daa2558b4b43311b68))
- encode env ([8939f0d](https://github.com/QQuik/quik_proximity_marketing/commit/8939f0d144c27424572e6084c1c7ee4e57a987fb))
- env ([e4e6e5d](https://github.com/QQuik/quik_proximity_marketing/commit/e4e6e5d4b3f4c9302d2f6d9fd5922f9ff3c18463))
- env ([29d2fa3](https://github.com/QQuik/quik_proximity_marketing/commit/29d2fa33c1bff95109dd0a56cbe3347c51d08b46))
- env and adjust UI ([096882a](https://github.com/QQuik/quik_proximity_marketing/commit/096882a307567439314fb144381a248a45b08e7e))
- filter for advanced analytic ([#393](https://github.com/QQuik/quik_proximity_marketing/issues/393)) ([7528be5](https://github.com/QQuik/quik_proximity_marketing/commit/7528be5fe9a026b1b4a51d654dff9a05f6198cc1))
- first name in contact form ([e88ad12](https://github.com/QQuik/quik_proximity_marketing/commit/e88ad1282a9123e7737abad74f6d213a4a0b1f9e))
- first name in contact form ([6ac61e5](https://github.com/QQuik/quik_proximity_marketing/commit/6ac61e5fa377d7789d9f573242b11e102259ce34))
- fix analytics page & add empty data section ([67729bb](https://github.com/QQuik/quik_proximity_marketing/commit/67729bb446011992f3b76d63031e25e3df7e7743))
- fix and create new tp v0.1 ([#453](https://github.com/QQuik/quik_proximity_marketing/issues/453)) ([54ec83f](https://github.com/QQuik/quik_proximity_marketing/commit/54ec83f19639735c3ae846574a738c0323139091))
- fix bug 30/6 about QR customize for better display ([ab6338c](https://github.com/QQuik/quik_proximity_marketing/commit/ab6338c1d940e792a23c91d5c5880de2cbb51ded))
- fix bugs based on error found ([a389762](https://github.com/QQuik/quik_proximity_marketing/commit/a389762dc80a068f880a95ab5d8e7273e821f4a3))
- fix cicd ([bfe6ca8](https://github.com/QQuik/quik_proximity_marketing/commit/bfe6ca84aa2576cbcc94597d47a808ace17cf78f))
- fix conflict ([d24dbf7](https://github.com/QQuik/quik_proximity_marketing/commit/d24dbf764e38731cf092c46ae786c454b2efee50))
- fix conflict ([358b2b7](https://github.com/QQuik/quik_proximity_marketing/commit/358b2b70273caed5c034c437509e5d57eaed29e1))
- fix conflict ([538c4be](https://github.com/QQuik/quik_proximity_marketing/commit/538c4beb30e6bfa9da6b41724e2dc7019a905614))
- fix conflict ([4348cc3](https://github.com/QQuik/quik_proximity_marketing/commit/4348cc3d2d94ae98f58963805c7cea14f08023e0))
- fix conflict ([27178d0](https://github.com/QQuik/quik_proximity_marketing/commit/27178d0dddd99476ae31181eaacc7fbbbe0905d6))
- fix conflict ([f328e69](https://github.com/QQuik/quik_proximity_marketing/commit/f328e699a0351511a2a83f2f40385892bd73be76))
- fix conflict ([0040321](https://github.com/QQuik/quik_proximity_marketing/commit/004032174ab136e83754ef90d7777c9b0a1f4386))
- fix conflict ([2ce83a2](https://github.com/QQuik/quik_proximity_marketing/commit/2ce83a2002e3250a3c099884494f97c6e577e07f))
- fix conflict ([62cdeac](https://github.com/QQuik/quik_proximity_marketing/commit/62cdeac6eacc06b574aba457133fad84d33d58fd))
- fix err ([c845612](https://github.com/QQuik/quik_proximity_marketing/commit/c8456129c7e40b4de7703bde892c91ce326b60d2))
- fix logic profile, adding switch to adjust status of assets and adding new column to supabase ([93d736c](https://github.com/QQuik/quik_proximity_marketing/commit/93d736cb15d80ad4153a07e6368a2f23d20426ba))
- fix logic profile, adding switch to adjust status of assets and adding new column to supabase ([#23](https://github.com/QQuik/quik_proximity_marketing/issues/23)) ([82870c7](https://github.com/QQuik/quik_proximity_marketing/commit/82870c71ffd8460ff30a3724613fabf5edaea7ea))
- fix login page ([5938fa7](https://github.com/QQuik/quik_proximity_marketing/commit/5938fa77cfae690711131fab13645ffc1867393e))
- fix offset of toaster ([3adc5dc](https://github.com/QQuik/quik_proximity_marketing/commit/3adc5dc6d1c1c4254ead71f7d27a9ba6ea0286fc))
- fix resize dowload qr ([0a03dbb](https://github.com/QQuik/quik_proximity_marketing/commit/0a03dbb8c768c1d1687c8ae6aef4540d399b19dd))
- fix resize dowload qr ([fe0e911](https://github.com/QQuik/quik_proximity_marketing/commit/fe0e9118ecc8481a665a54e360d219a4d63d87f7))
- fix resize dowload qr ([#207](https://github.com/QQuik/quik_proximity_marketing/issues/207)) ([19a1f82](https://github.com/QQuik/quik_proximity_marketing/commit/19a1f82e91baef25a5bed69ce88dccd44352ce5f))
- fix resize dowload qr ([#219](https://github.com/QQuik/quik_proximity_marketing/issues/219)) ([52ecf6b](https://github.com/QQuik/quik_proximity_marketing/commit/52ecf6b219d512b4bb40a24a2497f130e97954a1))
- fix table assets ([18cfa6b](https://github.com/QQuik/quik_proximity_marketing/commit/18cfa6b0b001c06e91384e02bcc3f9f5f0dc9d64))
- fix ui 13/5 ([2c93885](https://github.com/QQuik/quik_proximity_marketing/commit/2c9388578509f078b8494e9903433466fa3cc9b0))
- fix UI again ([2b9bbc2](https://github.com/QQuik/quik_proximity_marketing/commit/2b9bbc291f16ac3fbfc053a4bb7c1d65f9457f25))
- fix ui ver2 30/5 ([abf772e](https://github.com/QQuik/quik_proximity_marketing/commit/abf772ee19745c9723517800f6b74dc7bedde099))
- fix UI, navigation and i18n ([6146fc1](https://github.com/QQuik/quik_proximity_marketing/commit/6146fc1042e08fe99b06d67dbf77edcfe288234e))
- hidden countdown in premium plan and adjust content display ([#310](https://github.com/QQuik/quik_proximity_marketing/issues/310)) ([8ab9ebd](https://github.com/QQuik/quik_proximity_marketing/commit/8ab9ebddc7a1fc380a087aca9c7fee323638ab4c))
- hidden other filters ([1e83c05](https://github.com/QQuik/quik_proximity_marketing/commit/1e83c05dcda41187184562a87e66f8d86d4a36fa))
- hide apps select page ([6a9ca17](https://github.com/QQuik/quik_proximity_marketing/commit/6a9ca170ad49dcb3caab3cebba3e594aeec299ef))
- hide some field ([ddb0d92](https://github.com/QQuik/quik_proximity_marketing/commit/ddb0d9261175c85c756b4be8239259bc5222e06b))
- hide some module ([12b2ec3](https://github.com/QQuik/quik_proximity_marketing/commit/12b2ec3bd3ee632d8220ede6a79e85f6205790be))
- hotfix UI ([b3c5995](https://github.com/QQuik/quik_proximity_marketing/commit/b3c5995f3bc26121a391a8697125bc553728d391))
- import file validate data ([#406](https://github.com/QQuik/quik_proximity_marketing/issues/406)) ([1eab054](https://github.com/QQuik/quik_proximity_marketing/commit/1eab0542ca295b978e16b9393453288809bc64b0))
- improve ui ([3e46b36](https://github.com/QQuik/quik_proximity_marketing/commit/3e46b36922b7f1467892cfaf64756efcd8f4aa0e))
- improve UI dashboard & save qr image when insert/update tp ([#439](https://github.com/QQuik/quik_proximity_marketing/issues/439)) ([b366ca0](https://github.com/QQuik/quik_proximity_marketing/commit/b366ca072ffbda052b868e77c1a099c6e626919d))
- init ([4778ff1](https://github.com/QQuik/quik_proximity_marketing/commit/4778ff189a84e8dc69f74dde5988281a4aa11ef8))
- invite page ([b86e8f8](https://github.com/QQuik/quik_proximity_marketing/commit/b86e8f8494cc04c6b2f1dae524268b8edcd837b1))
- keep changes ([ee12d85](https://github.com/QQuik/quik_proximity_marketing/commit/ee12d854480fffb43d10fcc1e5e59a143f98b750))
- landing page ([9305782](https://github.com/QQuik/quik_proximity_marketing/commit/9305782903fef1cb3fe36e375bf4aeab5cd75cfd))
- list qr and shortlink ([#436](https://github.com/QQuik/quik_proximity_marketing/issues/436)) ([f9f80ba](https://github.com/QQuik/quik_proximity_marketing/commit/f9f80ba820b191c40faf8f693ba28ddefa7c0797))
- make redirect url of gg oAuth dynamic by window url ([ddb1e3a](https://github.com/QQuik/quik_proximity_marketing/commit/ddb1e3a59643dca618843467a60a2f60119c5eea))
- maps and fixing api error ([35c3f83](https://github.com/QQuik/quik_proximity_marketing/commit/35c3f831174c453e342f9f65d4f9a4d8ecab3123))
- missing code from cherry pick for linechart and heatmap ([#395](https://github.com/QQuik/quik_proximity_marketing/issues/395)) ([5cf5558](https://github.com/QQuik/quik_proximity_marketing/commit/5cf5558df5569df98752367cabb768cb536ae045))
- modified component fancy select ([9111253](https://github.com/QQuik/quik_proximity_marketing/commit/9111253b261ddd53c01871fcaa3e9e7d6dfe104c))
- modified dashboard unlock insight ([f2ae5f5](https://github.com/QQuik/quik_proximity_marketing/commit/f2ae5f5c9933ab305ee84f89cfeea20397a3e1cf))
- modified touch point details ([23f2820](https://github.com/QQuik/quik_proximity_marketing/commit/23f28203ac13e42bb84e1cc1ec4d7805d0bccd6a))
- modified UI and adjust contact form ([856e5ef](https://github.com/QQuik/quik_proximity_marketing/commit/856e5ef275711f567baa126822d4c0cf8d03aba8))
- modified UI for org settings ([afd1fec](https://github.com/QQuik/quik_proximity_marketing/commit/afd1fecf8fa4c285ca4924195f3ce6256a6a4fe3))
- modified UI v1.2 ([f2c4b9f](https://github.com/QQuik/quik_proximity_marketing/commit/f2c4b9f52ea791b1ff81cd4232da554dcf2aad12))
- modified v1.3 ([decd8d0](https://github.com/QQuik/quik_proximity_marketing/commit/decd8d0ef14695d5530f0f411664734a60df3e96))
- modify calendar & dockerfile ([0144c2a](https://github.com/QQuik/quik_proximity_marketing/commit/0144c2aed7581427efbd24bf4e6c3b414d79dce5))
- modify dashboard and analytic for matching design ([fa242f3](https://github.com/QQuik/quik_proximity_marketing/commit/fa242f322c2c17025977ed85c5fbeb8566e6cd0f))
- modify host ([edef7a6](https://github.com/QQuik/quik_proximity_marketing/commit/edef7a6eac089715f7c6f10e239bfffca95b17ab))
- modify logic & add some components ([5ec3444](https://github.com/QQuik/quik_proximity_marketing/commit/5ec3444ab1e374a2f66b15d9bf792605c78dd232))
- move analytic to dashboard ([409f35e](https://github.com/QQuik/quik_proximity_marketing/commit/409f35e7b502ad6bc4727b13bface56620c80981))
- move change to outside and fix UI ([d3ff55d](https://github.com/QQuik/quik_proximity_marketing/commit/d3ff55df6bbffd5f295013550d0eb232f8cfcb09))
- move change to outside and fix UI ([eabe667](https://github.com/QQuik/quik_proximity_marketing/commit/eabe66787c78d275d4c3ddd78a2ca4536c0378d6))
- move dev from release into pre-release ([0f7415f](https://github.com/QQuik/quik_proximity_marketing/commit/0f7415f9fb08f5ac57bdf13618776d21326c73e2))
- new .env.enc ([e534106](https://github.com/QQuik/quik_proximity_marketing/commit/e534106be9f0f83d61b7bdcf1e19dafdc5542423))
- new env for dev ([0cc5a3c](https://github.com/QQuik/quik_proximity_marketing/commit/0cc5a3c01c0076559015778105ef2fafc514e279))
- profile management ([f428a5b](https://github.com/QQuik/quik_proximity_marketing/commit/f428a5b050e359b43bc053fa7f987ec5047717c2))
- qr options client ([#445](https://github.com/QQuik/quik_proximity_marketing/issues/445)) ([1b5d23a](https://github.com/QQuik/quik_proximity_marketing/commit/1b5d23a8ebf9afaf8919eedfdc61a746bdeb5c1d))
- querykey for tag detail and max character display for name tp… ([#456](https://github.com/QQuik/quik_proximity_marketing/issues/456)) ([9349668](https://github.com/QQuik/quik_proximity_marketing/commit/934966816a16e3a6ad7b37c2b3d6c911451b2a3b))
- Readme ([0a0a617](https://github.com/QQuik/quik_proximity_marketing/commit/0a0a6178dfaa18adbee663af1ac814141e0bbd62))
- recover adding type t=1 ([e020921](https://github.com/QQuik/quik_proximity_marketing/commit/e0209216e01b763779876016080bc4c2d99670e0))
- redirect when going to home page ([91b10a7](https://github.com/QQuik/quik_proximity_marketing/commit/91b10a7af2fe73f92cbc4af2aeed7b553ff7737f))
- Remove authInterrupts config from next.config.mjs ([0bc574c](https://github.com/QQuik/quik_proximity_marketing/commit/0bc574cd8fb8cd325ba62c5dad798cf26c4f8496))
- remove isCreate for form ([0f61570](https://github.com/QQuik/quik_proximity_marketing/commit/0f615705a71ae529bb099413281282d67820d804))
- remove package next server ([#462](https://github.com/QQuik/quik_proximity_marketing/issues/462)) ([4b30473](https://github.com/QQuik/quik_proximity_marketing/commit/4b304735f8178f18e5905879ac4e4d95deef1167))
- remove some old files ([ceb8614](https://github.com/QQuik/quik_proximity_marketing/commit/ceb861400f654851ee9ac741b7853d17abbf5348))
- remove unneccsary console.log ([250278c](https://github.com/QQuik/quik_proximity_marketing/commit/250278ca78bbf4699b8ce8d1220048a434559102))
- remove unused import and add maw-width for right image in meta tags ([#337](https://github.com/QQuik/quik_proximity_marketing/issues/337)) ([a8d684c](https://github.com/QQuik/quik_proximity_marketing/commit/a8d684ce0f34865acdab03250b298702eba466fe))
- setting aside profile ([02bf644](https://github.com/QQuik/quik_proximity_marketing/commit/02bf644d70857ac15a657034996a058d78cc477f))
- setting section ([175f1a9](https://github.com/QQuik/quik_proximity_marketing/commit/175f1a966cc711508efac8f7707d25d68c61c985))
- setup AI Optimize Slug UI version 1.0, still missing AI Recom… ([#396](https://github.com/QQuik/quik_proximity_marketing/issues/396)) ([a995765](https://github.com/QQuik/quik_proximity_marketing/commit/a995765bd4662ae2a762a600bfe029ecb09dfa1e))
- show updated at in dashboard ([d71a6a7](https://github.com/QQuik/quik_proximity_marketing/commit/d71a6a7be9b72a02aa974f36030ad974afb9e2c3))
- sidebar UI update ([35635c3](https://github.com/QQuik/quik_proximity_marketing/commit/35635c320d40fdf07d30b009f262c01fe3192c31))
- slug generation prompt ([#405](https://github.com/QQuik/quik_proximity_marketing/issues/405)) ([023c55b](https://github.com/QQuik/quik_proximity_marketing/commit/023c55b3f40812beda8cde054d6a71affd07ab7e))
- still not create asset and activate NFC ([bcdc823](https://github.com/QQuik/quik_proximity_marketing/commit/bcdc823d6bf07f2750178260e86ebb3dc9be18ee))
- test cicd ([1a95e82](https://github.com/QQuik/quik_proximity_marketing/commit/1a95e8226f15ad18c53a367659517eaf2d9fd838))
- test cicd ([ce331be](https://github.com/QQuik/quik_proximity_marketing/commit/ce331bef6229949d6b38ea577b22287c389613a2))
- test cicd ([f88f177](https://github.com/QQuik/quik_proximity_marketing/commit/f88f177fb370aca1088136e002f940f0136424e6))
- text remove download shortlink list ([#444](https://github.com/QQuik/quik_proximity_marketing/issues/444)) ([1a0ab8f](https://github.com/QQuik/quik_proximity_marketing/commit/1a0ab8f2755a12ff9906f7000471777a32b9cc9f))
- title for form contact ([de343e3](https://github.com/QQuik/quik_proximity_marketing/commit/de343e318b0dbd41fb79ef7b53a0c25a2ca2d3c3))
- toast error when upload qr logo ([f957c80](https://github.com/QQuik/quik_proximity_marketing/commit/f957c800192e56cf45f4c79275ab00413e48b6d3))
- tooltip hover ([bfd889a](https://github.com/QQuik/quik_proximity_marketing/commit/bfd889a9238c6becffeb367771daea3b3369a74f))
- tooltip hover ([2976adc](https://github.com/QQuik/quik_proximity_marketing/commit/2976adcca20c048ea5888c29a84e77cd7211b029))
- tracking zalo OA and reset form after submit ([12d78a6](https://github.com/QQuik/quik_proximity_marketing/commit/12d78a69f32a3654d249c74bbb3f76b1726c61a6))
- translation and tag badges ([#448](https://github.com/QQuik/quik_proximity_marketing/issues/448)) ([494d7f1](https://github.com/QQuik/quik_proximity_marketing/commit/494d7f1ff5dfb1054c55baed56509cc0564a948a))
- translation files ([#381](https://github.com/QQuik/quik_proximity_marketing/issues/381)) ([6c6c91b](https://github.com/QQuik/quik_proximity_marketing/commit/6c6c91b2f885358de46de17735c1dcecaf27f5ff))
- ui change padding & slug schema ([#455](https://github.com/QQuik/quik_proximity_marketing/issues/455)) ([7b9963b](https://github.com/QQuik/quik_proximity_marketing/commit/7b9963bcdee37611cb5618f6e8498d85ff7e4789))
- ui for table assets ([9222f1c](https://github.com/QQuik/quik_proximity_marketing/commit/9222f1c02b410ce286e2e1de712fc83e3216b933))
- uncomment tab members ([7d4fff2](https://github.com/QQuik/quik_proximity_marketing/commit/7d4fff2e4e4381181986bee2b1be57f802c256d2))
- update cicd ([3641014](https://github.com/QQuik/quik_proximity_marketing/commit/364101409bb7e9e15dba49514d3f37cf3186ed0f))
- update cicd ([cbc9979](https://github.com/QQuik/quik_proximity_marketing/commit/cbc99790238726959cf033ff272b97b433792959))
- update cicd ([3108270](https://github.com/QQuik/quik_proximity_marketing/commit/31082701d73d38d4769ee73e15309d4e4c2b1388))
- update cicd ([61a6071](https://github.com/QQuik/quik_proximity_marketing/commit/61a60712db5216d7def9fde898245bae258aec02))
- update cicd ([6ff7731](https://github.com/QQuik/quik_proximity_marketing/commit/6ff77315eead05f7d2d42be2e7472b0ac96e9eec))
- update cicd ([3e1d80b](https://github.com/QQuik/quik_proximity_marketing/commit/3e1d80b84775214a110e8fcf47d6051e0dc96d9b))
- update cicd ([cc546bc](https://github.com/QQuik/quik_proximity_marketing/commit/cc546bc07689c006730a364e9797d6236f2b1dba))
- update cicd ([1c92e04](https://github.com/QQuik/quik_proximity_marketing/commit/1c92e04712850ec6ff01fee4445a71f61db7fe6a))
- update docker compose ([1e243a2](https://github.com/QQuik/quik_proximity_marketing/commit/1e243a2d8f1ef453c0933e9269dd01ad3bb63d09))
- update docker compose ([2cf88ca](https://github.com/QQuik/quik_proximity_marketing/commit/2cf88ca35f7f28d8cfbb76d2be9a6835193b6c43))
- update docker compose ([a1d54f3](https://github.com/QQuik/quik_proximity_marketing/commit/a1d54f31aaa4f777a9ee2317b246d96bf601aa41))
- update sidebar & navbar & some blank pages ([487eed1](https://github.com/QQuik/quik_proximity_marketing/commit/487eed10fce10882d6b7ee336d756f060daf6551))
- update skeleton for lazy load components ([dec8173](https://github.com/QQuik/quik_proximity_marketing/commit/dec817393885afe3d1628f38d9580f4ee5df8b01))
- update url of parcelvoy ([3003c02](https://github.com/QQuik/quik_proximity_marketing/commit/3003c023e4d49bc2a6b073d15365bbc2134cfe34))
- upgrade chart version ([57eaa2d](https://github.com/QQuik/quik_proximity_marketing/commit/57eaa2d17bae3fdcca8b3b55c7c2969bd52d39c7))
- using iconLeft instead of using children ([#458](https://github.com/QQuik/quik_proximity_marketing/issues/458)) ([e18def7](https://github.com/QQuik/quik_proximity_marketing/commit/e18def7263b9f9eb88488703d82d792eb2777d8d))
- using libary @next/third-parties for tracking GA" ([c5c6394](https://github.com/QQuik/quik_proximity_marketing/commit/c5c6394fa7f109e8741bd5e51644be76e717838b))
- v0.1 dashboard + analytic page ([7c2e6f4](https://github.com/QQuik/quik_proximity_marketing/commit/7c2e6f4cd8d6f5710db388bf7859e0c6add0cd72))
- version 1.0 for qr customize ([fef353f](https://github.com/QQuik/quik_proximity_marketing/commit/fef353f76ff0e1a0651393e114f71d81a45ceafb))
- watermarkbutton to accept children ([81ff136](https://github.com/QQuik/quik_proximity_marketing/commit/81ff1369834f5ae6a49c42d888da7183717da740))

### ♻️ Code Refactoring

- auth flow & middleware, remove casdoor client ([e25c325](https://github.com/QQuik/quik_proximity_marketing/commit/e25c325a6291aa1faa1dd1daff2e191649817372))
- components into features ([#362](https://github.com/QQuik/quik_proximity_marketing/issues/362)) ([17b5798](https://github.com/QQuik/quik_proximity_marketing/commit/17b57986fac8a48228e2e226af98e8eb5252c695))
- implement CORS middleware with enhanced security and caching headers ([9ffa50f](https://github.com/QQuik/quik_proximity_marketing/commit/9ffa50f0c652e6236ccff2174e5f17d2df674b1e))
- improve error handling and type safety in premium grant callback ([f86c134](https://github.com/QQuik/quik_proximity_marketing/commit/f86c1341f7aa184b0e1ce4ca94209189c47f44b4))
- improve file upload validation and error handling for CSV imports ([#409](https://github.com/QQuik/quik_proximity_marketing/issues/409)) ([692f058](https://github.com/QQuik/quik_proximity_marketing/commit/692f05829fd2d54481053ead07ee7a0182f3cff3))
- migrate from CampaignContentType to TouchPointContentType enum ([c89f26b](https://github.com/QQuik/quik_proximity_marketing/commit/c89f26b639a1e775aa8b12cb6618d19db70c2031))
- move assets into more structural place ([#347](https://github.com/QQuik/quik_proximity_marketing/issues/347)) ([2c3fac3](https://github.com/QQuik/quik_proximity_marketing/commit/2c3fac34e6703c1268d40784eaf90c3f7d547274))
- move logic tp delete & tp create into core ([fbeb3f7](https://github.com/QQuik/quik_proximity_marketing/commit/fbeb3f79fa165687f60df9787400f0c597698e88))
- move server utils and default meta tags to separate files ([5275182](https://github.com/QQuik/quik_proximity_marketing/commit/5275182a27337e80c1701cf29fa6edb5954b7bc9))
- move some data from provider to server component for clear loading state on view ([25f8f71](https://github.com/QQuik/quik_proximity_marketing/commit/25f8f71ffab3851bbc9c5a6b3a032e3ef4b75132))
- project structure ([#343](https://github.com/QQuik/quik_proximity_marketing/issues/343)) ([d4d601d](https://github.com/QQuik/quik_proximity_marketing/commit/d4d601dd5dfaafae57c3dfb4805d755ff99aaf47))
- remove loading state and spinner from QR code rendering component ([e1be078](https://github.com/QQuik/quik_proximity_marketing/commit/e1be0781ce233128097a50adb4f088a4e6c510d8))
- reorganize Dockerfile layers and enhance button component with icon positioning support ([e85b063](https://github.com/QQuik/quik_proximity_marketing/commit/e85b063cbcf2a8e63f22e64614e51ccd9068cb9f))
- repo service profile userplan ([#349](https://github.com/QQuik/quik_proximity_marketing/issues/349)) ([6b49180](https://github.com/QQuik/quik_proximity_marketing/commit/6b491805a020ca40a65d01293fed9aca0564c9e7))
- restructure codebase based features ([#363](https://github.com/QQuik/quik_proximity_marketing/issues/363)) ([849cbc0](https://github.com/QQuik/quik_proximity_marketing/commit/849cbc06703e9d633714ca519893e5bd21261dad))
- simplify touch point creation and update Redis password handling ([64544db](https://github.com/QQuik/quik_proximity_marketing/commit/64544db5beed8df67baa00a03dea7dda707ea7a3))
- touch point create api ([108549d](https://github.com/QQuik/quik_proximity_marketing/commit/108549dd01ad3ae14f88fb04085a1b703e0a05b8))
- touch point module into core ([#350](https://github.com/QQuik/quik_proximity_marketing/issues/350)) ([aaed4a0](https://github.com/QQuik/quik_proximity_marketing/commit/aaed4a01aa91ed0b4d470c1e18aca6c190835267))
- upgrade tailwind to v4 ([#473](https://github.com/QQuik/quik_proximity_marketing/issues/473)) ([6ee8dab](https://github.com/QQuik/quik_proximity_marketing/commit/6ee8dab91513df98f3708d13d11c0aaf7f10a8d0))
- use provided message as default error message instead of hardcoded strings ([e8188ac](https://github.com/QQuik/quik_proximity_marketing/commit/e8188acbfea5594734244217045099b3cce2b98e))

### Chore

- ... ([28bbd65](https://github.com/QQuik/quik_proximity_marketing/commit/28bbd654707253ab90bb3d1f1e64ba766a32cd3b))
- add dependabot configuration for daily yarn package updates ([c958da8](https://github.com/QQuik/quik_proximity_marketing/commit/c958da8ce0b0daae049d9de5c4b597648efd5e8d))
- add dev dependencies in build stage ([1a6734d](https://github.com/QQuik/quik_proximity_marketing/commit/1a6734d7b94194d9a396e57ecee4ebfdad991c18))
- add docs to exclude typescript ([3e9bd0c](https://github.com/QQuik/quik_proximity_marketing/commit/3e9bd0c80a4ca0e717e67344d6a1cd564fbe33af))
- add encrypted development environment variables ([2bbf745](https://github.com/QQuik/quik_proximity_marketing/commit/2bbf7450d096cdb9f590a322de4f1724e9cdad2a))
- add env ([929b0a0](https://github.com/QQuik/quik_proximity_marketing/commit/929b0a0352f54f25564a3a2bc30e7703751534b4))
- add log for debug ([76a3adc](https://github.com/QQuik/quik_proximity_marketing/commit/76a3adc9d7bfc4d86189f247cbd592d611b5ba01))
- add log for debug ([e27934d](https://github.com/QQuik/quik_proximity_marketing/commit/e27934dee40cc1676409176d848b3682ed5810a3))
- add log into dashboard route ([a537cd4](https://github.com/QQuik/quik_proximity_marketing/commit/a537cd4960d0551b6884a7571e2ca934807d0c34))
- add log into dashboard route ([719585b](https://github.com/QQuik/quik_proximity_marketing/commit/719585b6220eeabf8aecd479a3d51eefa614a516))
- add log into dashboard route ([94d3466](https://github.com/QQuik/quik_proximity_marketing/commit/94d3466b3b1d4b02b0c9f32232c839fad732584f))
- add log into refresh token for debug ([fb4b22d](https://github.com/QQuik/quik_proximity_marketing/commit/fb4b22d353fe76156ba250d4921b083f827e566e))
- add logs ([f6e43a4](https://github.com/QQuik/quik_proximity_marketing/commit/f6e43a482a2972ffe66c09835204ebe1fbb090ac))
- add new env enc file ([4c6b818](https://github.com/QQuik/quik_proximity_marketing/commit/4c6b8182dc9d41a3a0f81bf283a104ee8d1777ce))
- add params after login ([6034916](https://github.com/QQuik/quik_proximity_marketing/commit/60349161511fa570257c531fccf5e6d33a89ae71))
- add prettier config file ([7ba349b](https://github.com/QQuik/quik_proximity_marketing/commit/7ba349b3b4648e9b217f675f5ffc069cf411ee93))
- add sourcemap to debug ([65434f9](https://github.com/QQuik/quik_proximity_marketing/commit/65434f9a9e1be50a8cb0e1424dde13f2c73c23fb))
- add sudo pwd to command ([5638c9e](https://github.com/QQuik/quik_proximity_marketing/commit/5638c9edb15ca261ec6cd97230a93731ea017a08))
- adding animation bounce update qr realtime interactions tabs double re render qr safari ([#420](https://github.com/QQuik/quik_proximity_marketing/issues/420)) ([6f26dc8](https://github.com/QQuik/quik_proximity_marketing/commit/6f26dc89c3407e7114beac969222a527739ba28e))
- adding redis event key push file ([#423](https://github.com/QQuik/quik_proximity_marketing/issues/423)) ([f571ae1](https://github.com/QQuik/quik_proximity_marketing/commit/f571ae19b12b49b55ef447f8e237346d80d64584))
- change some text ([411efa3](https://github.com/QQuik/quik_proximity_marketing/commit/411efa3db5a096299946274d04d4a612fbfa6c12))
- change text ([ab14972](https://github.com/QQuik/quik_proximity_marketing/commit/ab1497204f2bc6d1f1dfe996e8ac2ec121a938ba))
- change text Analytic By Tag -> Basic Analytics ([b5b3ff3](https://github.com/QQuik/quik_proximity_marketing/commit/b5b3ff386282152fb7e982668358aacb76a656a9))
- **cicd:** add action to gemini review ([7b66448](https://github.com/QQuik/quik_proximity_marketing/commit/7b664488b3a75ebf8d0a980ecd9704e4d00e6b32))
- **cicd:** add action to gemini review ([22c780a](https://github.com/QQuik/quik_proximity_marketing/commit/22c780adbe6f54717ed234ecced04e7810b551c4))
- **cicd:** add sonar for workflow ([#459](https://github.com/QQuik/quik_proximity_marketing/issues/459)) ([d228fc3](https://github.com/QQuik/quik_proximity_marketing/commit/d228fc39d8aad3212748c85977183fee570efc1d))
- **cicd:** change workflow ([b0faaf6](https://github.com/QQuik/quik_proximity_marketing/commit/b0faaf6b427f28ceebfa878fc5ab0c6625f04e16))
- **cicd:** put sonar to PR only ([0812e79](https://github.com/QQuik/quik_proximity_marketing/commit/0812e796cf3cc35870a8969d647bfe0dc0dfc2c6))
- **cicd:** remove gemini review ([de6936d](https://github.com/QQuik/quik_proximity_marketing/commit/de6936d0d384f900f430ded7ddf215280b3d1620))
- **cicd:** update gemini model for review PR ([7b378d7](https://github.com/QQuik/quik_proximity_marketing/commit/7b378d734c174bc4405777924f55c30adf74a467))
- **cicd:** update gemini model for review PR ([d7e40e0](https://github.com/QQuik/quik_proximity_marketing/commit/d7e40e05a8e445134ea9c9a7b83c17932f077c49))
- disable auto meta tag generation for touch points ([cd6925d](https://github.com/QQuik/quik_proximity_marketing/commit/cd6925dc5731f1f6f6b1a000f5f28f202f51705d))
- disable auto meta tag generation for touch points ([7f46915](https://github.com/QQuik/quik_proximity_marketing/commit/7f4691515bc16b06f7b9420cda79052d7fa952fe))
- disable auto meta tags functionality in touch point service ([012693f](https://github.com/QQuik/quik_proximity_marketing/commit/012693f45aa086929ea62ab9fa3193ffc3920fd9))
- disable gen ai slug button and update translation file for ai … ([#421](https://github.com/QQuik/quik_proximity_marketing/issues/421)) ([a79df44](https://github.com/QQuik/quik_proximity_marketing/commit/a79df44f5958fa6a2668ac0acc440b5e975349b3))
- disable semantic release ([64b0a6a](https://github.com/QQuik/quik_proximity_marketing/commit/64b0a6a3997b7164c793df042f6d7512f0b6e6b8))
- disable this on development ([bce43a1](https://github.com/QQuik/quik_proximity_marketing/commit/bce43a1d8491b2d84e1fb202eef8b455ddae5888))
- downgrade typescript to major version 5 ([c299a04](https://github.com/QQuik/quik_proximity_marketing/commit/c299a04506b67cd06c66d983a895561c3d9b1afb))
- dummy push ([22a84c7](https://github.com/QQuik/quik_proximity_marketing/commit/22a84c7e6d2ce11a8dc3d92c588bc3ec583a849d))
- dummy push ([e0cf4a1](https://github.com/QQuik/quik_proximity_marketing/commit/e0cf4a180b72c163f25c39a40a565eb00a777770))
- dummy push ([1b39b30](https://github.com/QQuik/quik_proximity_marketing/commit/1b39b30533a71f4c4a8eb009a3ff040b127e06a1))
- dummy push ([8f08cea](https://github.com/QQuik/quik_proximity_marketing/commit/8f08cead9c6363706ed0ace1d8bba407e62e302b))
- dummy push ([37cfc78](https://github.com/QQuik/quik_proximity_marketing/commit/37cfc787fca640ee05e14b9e3ecd580713eabb4e))
- dummy push ([ff2efc7](https://github.com/QQuik/quik_proximity_marketing/commit/ff2efc7d8f1d7aa0de3a0145c843994f81b6dd04))
- dummy push ([7b3c4b4](https://github.com/QQuik/quik_proximity_marketing/commit/7b3c4b4c4ef4ff67cae5697a344f1c4faf92f92a))
- dummy push ([6b68f1e](https://github.com/QQuik/quik_proximity_marketing/commit/6b68f1e59dcefa7f1f61f576d34f9ea13c92daef))
- dummy push ([9b298d7](https://github.com/QQuik/quik_proximity_marketing/commit/9b298d726153ae780f8e75d956e4fa94a6269eb0))
- dummy push ([d936389](https://github.com/QQuik/quik_proximity_marketing/commit/d9363890dff0fd6eee475ff159c86680f535a9e2))
- dummy push ([cd61ea8](https://github.com/QQuik/quik_proximity_marketing/commit/cd61ea8c369adbbeb580b316c1dfa15656d51ae0))
- dummy push ([5731813](https://github.com/QQuik/quik_proximity_marketing/commit/5731813b09445a1cbfc84af331acbcc36121201e))
- dummy push ([fcde125](https://github.com/QQuik/quik_proximity_marketing/commit/fcde125a2c7a3a13e8a151ef7319787fe232be67))
- dummy push ([a9e2bfd](https://github.com/QQuik/quik_proximity_marketing/commit/a9e2bfd1650e3b052760e3c6f4491e42d88e5ed0))
- dummy push ([64fd2af](https://github.com/QQuik/quik_proximity_marketing/commit/64fd2afa8bb1814ba54ada754350044a25429d15))
- dummy push ([fdd8b44](https://github.com/QQuik/quik_proximity_marketing/commit/fdd8b4470d3f2a760f1a82d0f5a30eb267750402))
- exclude yarn.lock from review ([3a21e86](https://github.com/QQuik/quik_proximity_marketing/commit/3a21e869b86d065287a8eccf87a56e23dafc35e7))
- exclude yarn.lock from review ([ebbd182](https://github.com/QQuik/quik_proximity_marketing/commit/ebbd182a1cc9b013122c9e40bdde3f29fdff5543))
- fix ([2f78ee2](https://github.com/QQuik/quik_proximity_marketing/commit/2f78ee276d69c741ab1759c48a15b973a6e5c7cd))
- fix cicd ([d10281a](https://github.com/QQuik/quik_proximity_marketing/commit/d10281a9274a6d0aa74fcf35e5f076a9f43157d1))
- fix cicd ([651bbf8](https://github.com/QQuik/quik_proximity_marketing/commit/651bbf8b07998f1e8a8e6bf44e9034bbb1494b29))
- fix cicd ([fca0d4c](https://github.com/QQuik/quik_proximity_marketing/commit/fca0d4c85bf0f6992a93513fff9ba6c9ba403064))
- fix env ([2182e03](https://github.com/QQuik/quik_proximity_marketing/commit/2182e0379f886f04d2f576ecdff70376ea049868))
- fix file error ([dac8244](https://github.com/QQuik/quik_proximity_marketing/commit/dac82447e3361b32e755b5d410e650ed37ac2ba5))
- fix i18n cookie ([8b4627a](https://github.com/QQuik/quik_proximity_marketing/commit/8b4627a2781ab18e49c263ee6742e6ac39e65544))
- fix next build error ([7b1f3ae](https://github.com/QQuik/quik_proximity_marketing/commit/7b1f3aeed9962a77000e491e4ab03585a8100473))
- fix placeholder for search & add input ([b2157aa](https://github.com/QQuik/quik_proximity_marketing/commit/b2157aa2af1c5f336be8e143cf74105c4d75996e))
- fix text analytic visitors -> total ([32da4c6](https://github.com/QQuik/quik_proximity_marketing/commit/32da4c6af9bede8dfa4d4bfb3c5f6e9aa82318bd))
- fix workflow ([5379dc0](https://github.com/QQuik/quik_proximity_marketing/commit/5379dc0b936efc747aba14df8f6700d916fc271e))
- fixxxxxxxxxx ([211b84b](https://github.com/QQuik/quik_proximity_marketing/commit/211b84b7b4c242dc5e033bf0ab03982c6ec0281b))
- fixxxxxxxxxxx (final) ([2385e4c](https://github.com/QQuik/quik_proximity_marketing/commit/2385e4ce6ab3834980a4324f9d306fda1b67a8a5))
- init project structure ([9c09951](https://github.com/QQuik/quik_proximity_marketing/commit/9c09951e0828a2f93ffff0234d77ae9b95ac8c82))
- just release on main ([b694a32](https://github.com/QQuik/quik_proximity_marketing/commit/b694a323ac1395b3340802018fe2a6018b28b737))
- modify workflow ([90e1d49](https://github.com/QQuik/quik_proximity_marketing/commit/90e1d49c0bd965353f8edd0aeb7daba1700fede3))
- modify workflow ([d610d5a](https://github.com/QQuik/quik_proximity_marketing/commit/d610d5a574ddefc18365391a02af9e8c4448aaf1))
- omg, i forgot to add .env to gitignore and remove it ([9c6a120](https://github.com/QQuik/quik_proximity_marketing/commit/9c6a1207708f9c28527176c8450fc20fe80115e6))
- re-enable auto release ([14ce758](https://github.com/QQuik/quik_proximity_marketing/commit/14ce758c3f40a6948dd736d3d8593e12be008f64))
- re-trigger actions ([2396dff](https://github.com/QQuik/quik_proximity_marketing/commit/2396dff444084b51cdccac805a144f0193ec4bd0))
- **release:** 1.0.0 [skip ci] ([989e81f](https://github.com/QQuik/quik_proximity_marketing/commit/989e81f569f7a566fba0990ed3742d0b747130f4))
- **release:** 1.0.1 [skip ci] ([b6a67bf](https://github.com/QQuik/quik_proximity_marketing/commit/b6a67bfb95fabde105e31e3c72863a681c65d39c))
- **release:** 1.0.2-development.1 [skip ci] ([f11961c](https://github.com/QQuik/quik_proximity_marketing/commit/f11961c40c8d7b074fc1723f70e785b7779647ac))
- **release:** 1.0.2-development.2 [skip ci] ([9421abd](https://github.com/QQuik/quik_proximity_marketing/commit/9421abd65f77fed2f388d929fb2e4da73b2f4797))
- **release:** 1.0.2-development.3 [skip ci] ([db1465f](https://github.com/QQuik/quik_proximity_marketing/commit/db1465f7d8b0e004a6254a47d8a2a48645b6826e))
- **release:** 1.0.2-development.4 [skip ci] ([947d71b](https://github.com/QQuik/quik_proximity_marketing/commit/947d71b1086a781010bc9fb5f98083dd1a20b8b0))
- **release:** 1.0.2-development.5 [skip ci] ([b86fe6a](https://github.com/QQuik/quik_proximity_marketing/commit/b86fe6a80ae621add807ab48ed2d25b7ced6bf96))
- **release:** 1.1.0 [skip ci] ([7a50701](https://github.com/QQuik/quik_proximity_marketing/commit/7a5070169f9b00f25dfbe4cad6bf280cfa1eb494))
- **release:** 1.1.0 [skip ci] ([089c89e](https://github.com/QQuik/quik_proximity_marketing/commit/089c89e77d94014b67c9a355ab91bceef81e9678))
- **release:** 1.1.0 [skip ci] ([eb39e34](https://github.com/QQuik/quik_proximity_marketing/commit/eb39e34d038b80ab84d72ae25a3d1cd506cc7cb7))
- **release:** 1.1.0 [skip ci] ([dfcdbcb](https://github.com/QQuik/quik_proximity_marketing/commit/dfcdbcb77c3e73dce694fcc5c0a6dba937c77c73))
- **release:** 1.1.0 [skip ci] ([a7acd04](https://github.com/QQuik/quik_proximity_marketing/commit/a7acd04da28f8a5b755933baeb5b8eba9d71d06a))
- **release:** 1.1.0 [skip ci] ([ab614bb](https://github.com/QQuik/quik_proximity_marketing/commit/ab614bbb0df1c403d711009fa7d974be43994e6f))
- **release:** 1.1.0 [skip ci] ([174439d](https://github.com/QQuik/quik_proximity_marketing/commit/174439d878cd770f68f26b2ce1e5fbd0ce22262d))
- **release:** 1.1.0 [skip ci] ([d7d4365](https://github.com/QQuik/quik_proximity_marketing/commit/d7d4365ad6cda9c551c5a9921f08df643cadcf36))
- **release:** 1.1.0-development.1 [skip ci] ([aa757c7](https://github.com/QQuik/quik_proximity_marketing/commit/aa757c7434563cd45db9e79db7846a0d3b9ce819))
- **release:** 1.1.0-development.10 [skip ci] ([ac730b5](https://github.com/QQuik/quik_proximity_marketing/commit/ac730b52256d7496eaa25695b06f15814a098814))
- **release:** 1.1.0-development.11 [skip ci] ([edd6605](https://github.com/QQuik/quik_proximity_marketing/commit/edd66053b9e6b2428f055271fbe64a5094b0eb96))
- **release:** 1.1.0-development.12 [skip ci] ([8ec2589](https://github.com/QQuik/quik_proximity_marketing/commit/8ec2589ae97bd6068869d4b400e3144f928c71fe))
- **release:** 1.1.0-development.13 [skip ci] ([ec92a43](https://github.com/QQuik/quik_proximity_marketing/commit/ec92a435197994a1874baf51e492fb71518a9eee))
- **release:** 1.1.0-development.14 [skip ci] ([b4fc66c](https://github.com/QQuik/quik_proximity_marketing/commit/b4fc66cd2d8a5969a2571b401c15daa7b6dfe836))
- **release:** 1.1.0-development.15 [skip ci] ([db85d96](https://github.com/QQuik/quik_proximity_marketing/commit/db85d96758eadba5d8b8fc77409e52b8080ca24e))
- **release:** 1.1.0-development.16 [skip ci] ([cddcb6b](https://github.com/QQuik/quik_proximity_marketing/commit/cddcb6b1f6d25744fc08f318ba2a9e0712a00bb1))
- **release:** 1.1.0-development.17 [skip ci] ([634b66b](https://github.com/QQuik/quik_proximity_marketing/commit/634b66bc9c5a69f9dda5924bd48c4c610410b435))
- **release:** 1.1.0-development.18 [skip ci] ([33c3f90](https://github.com/QQuik/quik_proximity_marketing/commit/33c3f903f26d546419b9c4eae831153a67204c35))
- **release:** 1.1.0-development.19 [skip ci] ([77b5687](https://github.com/QQuik/quik_proximity_marketing/commit/77b56870a026b21d56576e83ac8e0f5d5735bd22))
- **release:** 1.1.0-development.2 [skip ci] ([5dc3ab8](https://github.com/QQuik/quik_proximity_marketing/commit/5dc3ab81efc081924994fb4e0dbc5c34e42d3508))
- **release:** 1.1.0-development.20 [skip ci] ([d61efa7](https://github.com/QQuik/quik_proximity_marketing/commit/d61efa7429e69a91407cf4ca3aa02ab22f00bff0))
- **release:** 1.1.0-development.21 [skip ci] ([41bf92b](https://github.com/QQuik/quik_proximity_marketing/commit/41bf92bdb4aabaecd0cd0540cce5621e764aeb07))
- **release:** 1.1.0-development.22 [skip ci] ([11ba010](https://github.com/QQuik/quik_proximity_marketing/commit/11ba0109563ce89a091d0b9266d8b0daeb8d632f))
- **release:** 1.1.0-development.23 [skip ci] ([d292094](https://github.com/QQuik/quik_proximity_marketing/commit/d29209492b57450a441f911cf954fc9d33b065e2))
- **release:** 1.1.0-development.24 [skip ci] ([8c46aec](https://github.com/QQuik/quik_proximity_marketing/commit/8c46aec05408a294177fc636b5bbb77f31ce8ec7))
- **release:** 1.1.0-development.25 [skip ci] ([067630e](https://github.com/QQuik/quik_proximity_marketing/commit/067630e8b79848affd3f2b89fdb510744c7b3341))
- **release:** 1.1.0-development.26 [skip ci] ([18ed4fa](https://github.com/QQuik/quik_proximity_marketing/commit/18ed4fa9be3bc674ce7db8ab5b7beca9b583ca7a))
- **release:** 1.1.0-development.27 [skip ci] ([953a743](https://github.com/QQuik/quik_proximity_marketing/commit/953a743dcabacbc8901fe6c92e05bb710406459a))
- **release:** 1.1.0-development.28 [skip ci] ([441a6d7](https://github.com/QQuik/quik_proximity_marketing/commit/441a6d7211122457d76b821ba4e722c6df422898))
- **release:** 1.1.0-development.29 [skip ci] ([28c3bd4](https://github.com/QQuik/quik_proximity_marketing/commit/28c3bd469654fbb859693edbc39f7ff2f4441d11))
- **release:** 1.1.0-development.3 [skip ci] ([3e1fa05](https://github.com/QQuik/quik_proximity_marketing/commit/3e1fa05c584834a1910264be180b08ff8df9da51))
- **release:** 1.1.0-development.30 [skip ci] ([6a7b004](https://github.com/QQuik/quik_proximity_marketing/commit/6a7b004031e88e618d685868046c349de74ab271))
- **release:** 1.1.0-development.31 [skip ci] ([1f15e2d](https://github.com/QQuik/quik_proximity_marketing/commit/1f15e2dddd3126c0b00c11e435308f406d41d448))
- **release:** 1.1.0-development.32 [skip ci] ([cc60e10](https://github.com/QQuik/quik_proximity_marketing/commit/cc60e102df67af27d2f27c7b4f4f78b4cc77ab6b))
- **release:** 1.1.0-development.33 [skip ci] ([519cd33](https://github.com/QQuik/quik_proximity_marketing/commit/519cd3359339ad50a7e74852ad8ee7e8e4c816ce))
- **release:** 1.1.0-development.34 [skip ci] ([dfd2460](https://github.com/QQuik/quik_proximity_marketing/commit/dfd24602c2ebce32e46f29c7fa1f980b2b204370))
- **release:** 1.1.0-development.35 [skip ci] ([9ec6003](https://github.com/QQuik/quik_proximity_marketing/commit/9ec60034af04a8b22ecf2d61a42accc15c9d8079))
- **release:** 1.1.0-development.36 [skip ci] ([0c21524](https://github.com/QQuik/quik_proximity_marketing/commit/0c2152469b719e522c15b7a59c92a4246ef9efb5))
- **release:** 1.1.0-development.37 [skip ci] ([a967741](https://github.com/QQuik/quik_proximity_marketing/commit/a967741b1338114502ce980f072c0d34f6aa6be6))
- **release:** 1.1.0-development.38 [skip ci] ([b727d2a](https://github.com/QQuik/quik_proximity_marketing/commit/b727d2a0e995d63b7ed3de3b3725b888afaf5433))
- **release:** 1.1.0-development.39 [skip ci] ([0a2ce57](https://github.com/QQuik/quik_proximity_marketing/commit/0a2ce57e667cc02bb61a92e70b67016cba75e92a))
- **release:** 1.1.0-development.4 [skip ci] ([bc70fa8](https://github.com/QQuik/quik_proximity_marketing/commit/bc70fa8354145c3c4f77e567d801588b3e3b6243))
- **release:** 1.1.0-development.40 [skip ci] ([2074b20](https://github.com/QQuik/quik_proximity_marketing/commit/2074b202dc787a15629482860f5953fc4d7a7c53))
- **release:** 1.1.0-development.41 [skip ci] ([5aa6a14](https://github.com/QQuik/quik_proximity_marketing/commit/5aa6a149e7ff830a5d6525195080a95af9e11c12))
- **release:** 1.1.0-development.42 [skip ci] ([33344ca](https://github.com/QQuik/quik_proximity_marketing/commit/33344ca70f5b2b88658a5968d6e0632153f67aa2))
- **release:** 1.1.0-development.43 [skip ci] ([fe4c881](https://github.com/QQuik/quik_proximity_marketing/commit/fe4c881059f7f300a60fd1d90269b022034021d2))
- **release:** 1.1.0-development.44 [skip ci] ([559e2bc](https://github.com/QQuik/quik_proximity_marketing/commit/559e2bc2b98bcb2cdbdd782e44e95728e73c2d75))
- **release:** 1.1.0-development.45 [skip ci] ([3db5a94](https://github.com/QQuik/quik_proximity_marketing/commit/3db5a94d587ce5d48f42b39f5311c27d14ce4be6))
- **release:** 1.1.0-development.46 [skip ci] ([114ea84](https://github.com/QQuik/quik_proximity_marketing/commit/114ea84ee1107dc075c0a2373039eb8b039704db))
- **release:** 1.1.0-development.47 [skip ci] ([d40ae1a](https://github.com/QQuik/quik_proximity_marketing/commit/d40ae1ad1b8b765e2f4dc0035f88172de748d991))
- **release:** 1.1.0-development.48 [skip ci] ([1285efd](https://github.com/QQuik/quik_proximity_marketing/commit/1285efd50cccae99f8048e88715dc12da14836f7))
- **release:** 1.1.0-development.49 [skip ci] ([32ab711](https://github.com/QQuik/quik_proximity_marketing/commit/32ab7113cb7ae46036180cc597ac65827552fe82))
- **release:** 1.1.0-development.5 [skip ci] ([597b7fb](https://github.com/QQuik/quik_proximity_marketing/commit/597b7fbb6bc30db042c47050eec67ab8203080d0))
- **release:** 1.1.0-development.50 [skip ci] ([22f3577](https://github.com/QQuik/quik_proximity_marketing/commit/22f3577f8e1b0fada483e0e68caf983dd0a33d5d))
- **release:** 1.1.0-development.51 [skip ci] ([567edcf](https://github.com/QQuik/quik_proximity_marketing/commit/567edcfb0dfb01b033bd0efe2dc5cf382ebd8c0e))
- **release:** 1.1.0-development.52 [skip ci] ([34b0760](https://github.com/QQuik/quik_proximity_marketing/commit/34b0760333d92f909beeffbadc679403f220b6be))
- **release:** 1.1.0-development.53 [skip ci] ([8e9cfd7](https://github.com/QQuik/quik_proximity_marketing/commit/8e9cfd7be36d5bb17c6178f0e469d7f32be1060b))
- **release:** 1.1.0-development.54 [skip ci] ([d74b6ce](https://github.com/QQuik/quik_proximity_marketing/commit/d74b6ceea1373d044942fbebe789b53fc248bf1e))
- **release:** 1.1.0-development.55 [skip ci] ([2cd7951](https://github.com/QQuik/quik_proximity_marketing/commit/2cd7951abd7a07673de2e56a67e6f2b957a9ecda))
- **release:** 1.1.0-development.56 [skip ci] ([825be56](https://github.com/QQuik/quik_proximity_marketing/commit/825be56c144bb01bce135b9e96165369e369fa09))
- **release:** 1.1.0-development.57 [skip ci] ([43e9f7b](https://github.com/QQuik/quik_proximity_marketing/commit/43e9f7bea5b06b335961fa5cf7a393e73b310092))
- **release:** 1.1.0-development.58 [skip ci] ([26c1a4f](https://github.com/QQuik/quik_proximity_marketing/commit/26c1a4fa48968de30b4ba4f8f7317fa732d4eed4))
- **release:** 1.1.0-development.59 [skip ci] ([fdfff14](https://github.com/QQuik/quik_proximity_marketing/commit/fdfff14c5aec5646f85dfff0794ad02f39a2df86))
- **release:** 1.1.0-development.6 [skip ci] ([c705a14](https://github.com/QQuik/quik_proximity_marketing/commit/c705a147558579ff61b2081650acda959f8aec4f))
- **release:** 1.1.0-development.60 [skip ci] ([71b42aa](https://github.com/QQuik/quik_proximity_marketing/commit/71b42aad2bb356bb8879c2fe3ff89f85709f7964))
- **release:** 1.1.0-development.61 [skip ci] ([2a41805](https://github.com/QQuik/quik_proximity_marketing/commit/2a41805cff4d775cdf786de4cef4e92c40a76417))
- **release:** 1.1.0-development.62 [skip ci] ([74fae1f](https://github.com/QQuik/quik_proximity_marketing/commit/74fae1ffb2d8440395893c9fa5c46419872dd4f7))
- **release:** 1.1.0-development.63 [skip ci] ([3e78b07](https://github.com/QQuik/quik_proximity_marketing/commit/3e78b07e40b93b3a5584a63a1ffa65ab76009f33))
- **release:** 1.1.0-development.64 [skip ci] ([d6e7b7c](https://github.com/QQuik/quik_proximity_marketing/commit/d6e7b7c01df21102d334f1d0a85058bb31d43c55))
- **release:** 1.1.0-development.65 [skip ci] ([c10571f](https://github.com/QQuik/quik_proximity_marketing/commit/c10571f601ff7c69bd5f07bd53fa40dc701ad9db))
- **release:** 1.1.0-development.66 [skip ci] ([dd1760c](https://github.com/QQuik/quik_proximity_marketing/commit/dd1760c650946345dc9d9c3364436156d471f3a6))
- **release:** 1.1.0-development.67 [skip ci] ([a42853b](https://github.com/QQuik/quik_proximity_marketing/commit/a42853b6ff480e46b1f39e19531a0ab1a0a43cce))
- **release:** 1.1.0-development.68 [skip ci] ([e41bb6a](https://github.com/QQuik/quik_proximity_marketing/commit/e41bb6aeea273fe0991c9b72887d2eac3b0f4fc4))
- **release:** 1.1.0-development.69 [skip ci] ([b6f8152](https://github.com/QQuik/quik_proximity_marketing/commit/b6f8152ec6a2b901e6082959ade8f9f51cf2d210))
- **release:** 1.1.0-development.7 [skip ci] ([8568c4a](https://github.com/QQuik/quik_proximity_marketing/commit/8568c4a721b8433ce6280f99625fe3804f63ad26))
- **release:** 1.1.0-development.70 [skip ci] ([f3b7854](https://github.com/QQuik/quik_proximity_marketing/commit/f3b7854d68caf197b5404cfec6e2719fea979867))
- **release:** 1.1.0-development.71 [skip ci] ([3bb9d92](https://github.com/QQuik/quik_proximity_marketing/commit/3bb9d920ce6cc9feb1d5b8c3b5a9455d651d67f1))
- **release:** 1.1.0-development.72 [skip ci] ([a97d954](https://github.com/QQuik/quik_proximity_marketing/commit/a97d954d999b9dcf796a0bf8cc3bfcdee4cc2f17))
- **release:** 1.1.0-development.73 [skip ci] ([497b614](https://github.com/QQuik/quik_proximity_marketing/commit/497b61444cc538dce36f868918b09e6f8fefaba9))
- **release:** 1.1.0-development.74 [skip ci] ([21ec7c8](https://github.com/QQuik/quik_proximity_marketing/commit/21ec7c8248f4fe2456ab72a0f1ffd2cf4b5e2677))
- **release:** 1.1.0-development.75 [skip ci] ([6f16624](https://github.com/QQuik/quik_proximity_marketing/commit/6f16624960d354ede51cd26c8a54612391ee4c42))
- **release:** 1.1.0-development.76 [skip ci] ([2d121e7](https://github.com/QQuik/quik_proximity_marketing/commit/2d121e736e934b5a88de9e761b886e723a9ab367))
- **release:** 1.1.0-development.77 [skip ci] ([bc41e38](https://github.com/QQuik/quik_proximity_marketing/commit/bc41e38e3d07c3f9a95c70b04334e26f101b3454))
- **release:** 1.1.0-development.78 [skip ci] ([7da0baf](https://github.com/QQuik/quik_proximity_marketing/commit/7da0baf12d226ef16ccbf6173e0d9d3f266133a6))
- **release:** 1.1.0-development.79 [skip ci] ([8a85855](https://github.com/QQuik/quik_proximity_marketing/commit/8a858555ddfa892cb8aa3f4dd5a507e936cc9c2e))
- **release:** 1.1.0-development.8 [skip ci] ([e8181be](https://github.com/QQuik/quik_proximity_marketing/commit/e8181beae4e6089335fed26e05fa61eefa8008ef))
- **release:** 1.1.0-development.80 [skip ci] ([76f2cd7](https://github.com/QQuik/quik_proximity_marketing/commit/76f2cd797c3e75e0a9afe6b947d455d53925f930))
- **release:** 1.1.0-development.81 [skip ci] ([b155265](https://github.com/QQuik/quik_proximity_marketing/commit/b1552653b174cd11c55ce0850e666815b21f402c))
- **release:** 1.1.0-development.82 [skip ci] ([f228566](https://github.com/QQuik/quik_proximity_marketing/commit/f228566a39860cae8382d55a9eaf2eb0e72e30b0))
- **release:** 1.1.0-development.83 [skip ci] ([20b87d0](https://github.com/QQuik/quik_proximity_marketing/commit/20b87d06c7c1982caea15a8d30aa505d5e2ac033))
- **release:** 1.1.0-development.84 [skip ci] ([dc9541a](https://github.com/QQuik/quik_proximity_marketing/commit/dc9541af08815289a16cdef9d33c03419d67f6cb))
- **release:** 1.1.0-development.85 [skip ci] ([46cfb1f](https://github.com/QQuik/quik_proximity_marketing/commit/46cfb1f0ad9942fa1565eae7d1b0e114f02febab))
- **release:** 1.1.0-development.86 [skip ci] ([d562d89](https://github.com/QQuik/quik_proximity_marketing/commit/d562d89994b9addf10125269a3e7640d64202277))
- **release:** 1.1.0-development.87 [skip ci] ([66f9c50](https://github.com/QQuik/quik_proximity_marketing/commit/66f9c509a62cfedebcca99fe18c6138be4821d37))
- **release:** 1.1.0-development.88 [skip ci] ([c79d056](https://github.com/QQuik/quik_proximity_marketing/commit/c79d056071d2f00b51039ae298c490873b64edba))
- **release:** 1.1.0-development.89 [skip ci] ([79b776e](https://github.com/QQuik/quik_proximity_marketing/commit/79b776ee32cee93992a89f7f5e7d8edf260aa02f))
- **release:** 1.1.0-development.9 [skip ci] ([ef57798](https://github.com/QQuik/quik_proximity_marketing/commit/ef57798d272e969223fab870a7db99ee8660630c))
- **release:** 1.1.0-development.90 [skip ci] ([21bbc29](https://github.com/QQuik/quik_proximity_marketing/commit/21bbc2940aa90d29d0685e605a99a98893fd4051))
- remove debug logging statements from touchpoint migration ([c0a815e](https://github.com/QQuik/quik_proximity_marketing/commit/c0a815e2fe29e5f2248d123aaf98e88ad36be97c))
- remove docs & update i18n dropdown ([44de647](https://github.com/QQuik/quik_proximity_marketing/commit/44de64784e1ec72c745aea3de4ca611cf49539bf))
- remove old code ([6f40609](https://github.com/QQuik/quik_proximity_marketing/commit/6f40609327532fb4360586717b556744f95c90f6))
- remove old code ([f0e7eaa](https://github.com/QQuik/quik_proximity_marketing/commit/f0e7eaa525952304dcb767e67e7d196e271564ca))
- remove sentry example page ([71fbcb1](https://github.com/QQuik/quik_proximity_marketing/commit/71fbcb18883e09d43a210506285a6271432e9947))
- remove sentry to show source map ([607bdbd](https://github.com/QQuik/quik_proximity_marketing/commit/607bdbd3d3a1204e87c48960ab5d4561db52d45f))
- remove sourcemap ([dc34fb9](https://github.com/QQuik/quik_proximity_marketing/commit/dc34fb9df7486b2143f30f17ad4c1e9290e6933c))
- replace FZ Poppins with BeVietnamPro font family and update button styles ([e6174c2](https://github.com/QQuik/quik_proximity_marketing/commit/e6174c2f1c0b4d320e5114f3b55e17131415ace4))
- restructure some file/folder ([#357](https://github.com/QQuik/quik_proximity_marketing/issues/357)) ([348ef07](https://github.com/QQuik/quik_proximity_marketing/commit/348ef07e6c98ee788953a0834d652798123c1a9d))
- revert env & change host ([9bbbdc1](https://github.com/QQuik/quik_proximity_marketing/commit/9bbbdc152ce0c8eb2b508966608912d6707253d7))
- temporarily disable CombinedFilter and CurrentFilters components in analytics view ([b7bc9f1](https://github.com/QQuik/quik_proximity_marketing/commit/b7bc9f1b8ad14cae873428f5fd676676d4716230))
- test cicd ([c307579](https://github.com/QQuik/quik_proximity_marketing/commit/c3075792c8315020bccfed295f885ac27d71f483))
- test cicd ([b92b826](https://github.com/QQuik/quik_proximity_marketing/commit/b92b8269c700a172125fe28c5c57bc6fcccb0a13))
- test parcelvoy auth ([fdf3c27](https://github.com/QQuik/quik_proximity_marketing/commit/fdf3c27ee1d9bf0289188d1438aabab5f0ffcf7b))
- update .env.prod ([b5111eb](https://github.com/QQuik/quik_proximity_marketing/commit/b5111eb04a1d703f10abbecd4f38ab6e43958fdc))
- update cicd ([b89a6df](https://github.com/QQuik/quik_proximity_marketing/commit/b89a6df6597916cb5f6b4919aa693060b6974ee9))
- update cicd ([8d29524](https://github.com/QQuik/quik_proximity_marketing/commit/8d29524cd88a51cc558dc0aa3b8f3590e1efd478))
- update dev env encoded ([e9096c3](https://github.com/QQuik/quik_proximity_marketing/commit/e9096c33ff3fb8d7ac1d709ffb7c57b3747fa84e))
- update encrypted development environment variables ([f5d9e1f](https://github.com/QQuik/quik_proximity_marketing/commit/f5d9e1f9e59f78ece240fb21bee1a3b11a7cac27))
- update encrypted development environment variables ([80d5457](https://github.com/QQuik/quik_proximity_marketing/commit/80d545799196e3f2e1d159e3baaeded115d125d1))
- update env ([89266f6](https://github.com/QQuik/quik_proximity_marketing/commit/89266f669be74fa640ff3146d9849b156e118f59))
- update env encoded ([dbf18ca](https://github.com/QQuik/quik_proximity_marketing/commit/dbf18ca8f29d2ab9e5082dc0cac5c042595a1531))
- update error message and remove endOfLine config in prettier ([f6cd34a](https://github.com/QQuik/quik_proximity_marketing/commit/f6cd34a5af907faa5545ddb56ef1e2328c321b57))
- update lockable section groupcss name ([4a6d86c](https://github.com/QQuik/quik_proximity_marketing/commit/4a6d86c2ba6b6b310efc9fc344e03b1546bbd9c3))
- update minor detail ([#384](https://github.com/QQuik/quik_proximity_marketing/issues/384)) ([82a9646](https://github.com/QQuik/quik_proximity_marketing/commit/82a96469ba662990510632e32725231eaab3bc58))
- update new .env.enc ([788cbdd](https://github.com/QQuik/quik_proximity_marketing/commit/788cbdd31c89642a228e6e5e3800538c10319844))
- update new encoded env ([3150d7a](https://github.com/QQuik/quik_proximity_marketing/commit/3150d7af58c63714a1d067d25c120986ab8e1dda))
- update prettier ([eda7999](https://github.com/QQuik/quik_proximity_marketing/commit/eda7999709c526540326ddf5d65b6c1e5e1fbfc3))
- update readme for project structure ([98d2f57](https://github.com/QQuik/quik_proximity_marketing/commit/98d2f5701dbf583895a8a101869838c30b84bf09))
- update releaserc json ([92568df](https://github.com/QQuik/quik_proximity_marketing/commit/92568df4f866a9da9701cda7c727eeed975cd621))
- update translation and return text ([#385](https://github.com/QQuik/quik_proximity_marketing/issues/385)) ([31b0f04](https://github.com/QQuik/quik_proximity_marketing/commit/31b0f0478988c14ccf8a8a3f656707791081fbef))
- update translation files ([#374](https://github.com/QQuik/quik_proximity_marketing/issues/374)) ([03a2d9b](https://github.com/QQuik/quik_proximity_marketing/commit/03a2d9b11c7b8e1af12d15a7543b003a4c42b996))
- update translation for UX ([#383](https://github.com/QQuik/quik_proximity_marketing/issues/383)) ([73523f8](https://github.com/QQuik/quik_proximity_marketing/commit/73523f82cf6e2a708436c7ad812648211bdeced5))
- update UI bugs ([#446](https://github.com/QQuik/quik_proximity_marketing/issues/446)) ([635d141](https://github.com/QQuik/quik_proximity_marketing/commit/635d141195b9fc450b6c7bfad33a44f1aa312b61))
- update using hook usedayjs topperformance tp text ([#377](https://github.com/QQuik/quik_proximity_marketing/issues/377)) ([91fce81](https://github.com/QQuik/quik_proximity_marketing/commit/91fce81eab6543a983e6a5ea5cc00dcdaaa97274))
- update width select column query key qr list ([#450](https://github.com/QQuik/quik_proximity_marketing/issues/450)) ([38c94b0](https://github.com/QQuik/quik_proximity_marketing/commit/38c94b0ad2bb85292c633783ae57a9f855b7756c))
- use dayjs shared lib ([#378](https://github.com/QQuik/quik_proximity_marketing/issues/378)) ([348a284](https://github.com/QQuik/quik_proximity_marketing/commit/348a28466893b0553034fd08bb42c70f5807b8da))

### 🎨 Code Style

- add skeleton for smooth ([f3184b0](https://github.com/QQuik/quik_proximity_marketing/commit/f3184b05e51d9d372a14d3b21f4c7ad9965d77a9))
- adding style inherit to override default style of sonner ([#345](https://github.com/QQuik/quik_proximity_marketing/issues/345)) ([309912d](https://github.com/QQuik/quik_proximity_marketing/commit/309912dc50d1d63aba35dd2550e691651dd60f6b))
- fix border & try to fix qr download ([184cd56](https://github.com/QQuik/quik_proximity_marketing/commit/184cd560bb819abfd2d64c49a2352d6a1d799f7c))
- fix chart pie in analytic page ([14b7599](https://github.com/QQuik/quik_proximity_marketing/commit/14b7599bd11b5aff591662b2a1add2f0263d6cea))
- fix color chart ([10df64e](https://github.com/QQuik/quik_proximity_marketing/commit/10df64e5e4643ea8f85b2498133d99d4d653a230))
- fix color for toast description on darktheme ([dcaf507](https://github.com/QQuik/quik_proximity_marketing/commit/dcaf5078efbf8e4df1015d12fe2c1b14cf3d1b4a))
- make advanced analytic's last 2 tabs not clickable ([f9e2cdb](https://github.com/QQuik/quik_proximity_marketing/commit/f9e2cdb00d0120a4a583e106d27e9911ad90a7d0))
- remove deployment dependency from semantic release job ([e09766f](https://github.com/QQuik/quik_proximity_marketing/commit/e09766feb9750e244eb73e1193d5846c03542257))
- remove input border and outline styles in base input component ([da3e50b](https://github.com/QQuik/quik_proximity_marketing/commit/da3e50b249c3a536b7debaeda2846227d1e9c3ea))
- update chart color ([24f50f6](https://github.com/QQuik/quik_proximity_marketing/commit/24f50f62f5ed0499781b1b9b2b226fa3c6330f59))
- update QR code styling with square dots and corners, adjust UI spacing ([05c3b63](https://github.com/QQuik/quik_proximity_marketing/commit/05c3b637cfe4224c77e85691313e0a7859180471))
- update secondary color to purple in dark theme ([63a465a](https://github.com/QQuik/quik_proximity_marketing/commit/63a465af42026f4e02540d1420a81ccfa67d0cf1))
- update style for not misunderstanding ([4587567](https://github.com/QQuik/quik_proximity_marketing/commit/45875674ddfb80ba28b7b572a87f8229af97895b))
- update UI components with consistent sizing and improved visual design ([6655908](https://github.com/QQuik/quik_proximity_marketing/commit/6655908bc816baceed55814406d52334ebcfe983))

### 🚀 Performance Improvements

- implement code splitting and optimize package imports for better performance ([#431](https://github.com/QQuik/quik_proximity_marketing/issues/431)) ([f5426b4](https://github.com/QQuik/quik_proximity_marketing/commit/f5426b4b589d8c110e671d2f183f4d3ee1e60e9f))

## [1.1.0-development.90](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.89...v1.1.0-development.90) (2025-09-29)

### 🐛 Bug Fixes

- change default qr logo and fix dayjs usage in tp list ([#480](https://github.com/QQuik/quik_proximity_marketing/issues/480)) ([801eb32](https://github.com/QQuik/quik_proximity_marketing/commit/801eb32b3ff7dda7177419d9a94f583e4053d152))
- **cicd:** fix semantic release ([3044fe7](https://github.com/QQuik/quik_proximity_marketing/commit/3044fe7643b5c7b4973e509a60241ed39d448430))
- **cicd:** release only on main ([ed6f583](https://github.com/QQuik/quik_proximity_marketing/commit/ed6f5831d7b82a7dc97717d5005ebbb983792888))
- fix metatag & utm tag logic ([48a10a8](https://github.com/QQuik/quik_proximity_marketing/commit/48a10a8bf3c4420075360290738460d35f145953))
- tp logic ([83ae675](https://github.com/QQuik/quik_proximity_marketing/commit/83ae675795b6834b2fc21f93a3ce708dfd08882e))
- yarn build error ([52c7885](https://github.com/QQuik/quik_proximity_marketing/commit/52c78855ef687f61dd4db44afef79d0bda021b24))

### 🛠 Updates

- fix bugs based on error found ([a389762](https://github.com/QQuik/quik_proximity_marketing/commit/a389762dc80a068f880a95ab5d8e7273e821f4a3))

### Chore

- **cicd:** change workflow ([b0faaf6](https://github.com/QQuik/quik_proximity_marketing/commit/b0faaf6b427f28ceebfa878fc5ab0c6625f04e16))
- **release:** 1.1.0 [skip ci] ([089c89e](https://github.com/QQuik/quik_proximity_marketing/commit/089c89e77d94014b67c9a355ab91bceef81e9678))

## [1.1.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.1...v1.1.0) (2025-09-29)

### ✨ Features

- add 3 links per day limit and auto-delete after 7 days for anonymous touch points ([4b2fade](https://github.com/QQuik/quik_proximity_marketing/commit/4b2fade6b2617f9048c2c287d9e0da8e9bbf3032))
- add advanced analytic with mockup data ([#351](https://github.com/QQuik/quik_proximity_marketing/issues/351)) ([01ea0ec](https://github.com/QQuik/quik_proximity_marketing/commit/01ea0ececcb250ee0a0cf4a48cc0837b573d439e))
- add ai generate slug components ([8e09ba4](https://github.com/QQuik/quik_proximity_marketing/commit/8e09ba41141039e494f4c2a3a42f6a5678e656c9))
- add behavior tabs with api ([#365](https://github.com/QQuik/quik_proximity_marketing/issues/365)) ([93600ec](https://github.com/QQuik/quik_proximity_marketing/commit/93600ec7fb90c0ea76834ce6796223ad648ecf9c))
- add behavior tabs with mockdata [#364](https://github.com/QQuik/quik_proximity_marketing/issues/364) ([caaf378](https://github.com/QQuik/quik_proximity_marketing/commit/caaf378e40672365d57c71bc76fd2a33beae35bb))
- add bootstrap client ([#388](https://github.com/QQuik/quik_proximity_marketing/issues/388)) ([3e247fc](https://github.com/QQuik/quik_proximity_marketing/commit/3e247fc1a84a37db163e39b1bdca728ad0b11fa5))
- add domain-based cookie handling for cross-subdomain authentication ([38550b0](https://github.com/QQuik/quik_proximity_marketing/commit/38550b004d0d947a6d06824b0edb75a73ab43fc6))
- add download button for QR code in migrated anonymous dialog ([cd884bb](https://github.com/QQuik/quik_proximity_marketing/commit/cd884bb08e84e7c17b4eaddbe492c2b867aeead3))
- add expiration dates and SameSite policy to auth cookies ([92421db](https://github.com/QQuik/quik_proximity_marketing/commit/92421dbc392fd0b624ff4d8bff8a3660b4d48534))
- add form dirty state tracking and reset functionality for QR customization ([ed893e4](https://github.com/QQuik/quik_proximity_marketing/commit/ed893e4c9f275e291118e46e290a4b637a237cda))
- add host to allowed CORS headers in middleware ([09e8d1b](https://github.com/QQuik/quik_proximity_marketing/commit/09e8d1b90718c59043db6c141cf4a196f0d292c8))
- add i18n support for error messages in react-query error handler ([67e1bc5](https://github.com/QQuik/quik_proximity_marketing/commit/67e1bc515a996a02ea4fbe593fda7bfaec7d9bb5))
- add i18n support for error messages with default fallbacks ([5249af9](https://github.com/QQuik/quik_proximity_marketing/commit/5249af9c180276f8d68620add84ce8c856db9576))
- add lazy load into advanced analytic overview page ([26ee8ba](https://github.com/QQuik/quik_proximity_marketing/commit/26ee8ba48b3dc42c6b04a36f1ec9cd12ea539956))
- add locale support for AI-generated slugs and improve error handling ([#410](https://github.com/QQuik/quik_proximity_marketing/issues/410)) ([bf592b0](https://github.com/QQuik/quik_proximity_marketing/commit/bf592b0cc95361adc81248d8564f12c2eea0d5ca))
- add localized format plugin and simplify anon touch points response structure ([a2a9107](https://github.com/QQuik/quik_proximity_marketing/commit/a2a9107ca1301efc84e2191bf48375b5c2bef97d))
- add maxLength validation to tag inputs with 32 character limit ([f8d031f](https://github.com/QQuik/quik_proximity_marketing/commit/f8d031fe0a2d4f78708d55baf5dcea39736e57a0))
- add name validation to touch point update schema with min/max length ([83869e9](https://github.com/QQuik/quik_proximity_marketing/commit/83869e95b93766ef88244466c7127a4a9be4ccf2))
- add openobserve browser rum ([7d9a2fd](https://github.com/QQuik/quik_proximity_marketing/commit/7d9a2fd61161ad08e43801bd5c3798ff773999a8))
- add OPTIONS handler with CORS support for touch-point endpoints ([5e23d38](https://github.com/QQuik/quik_proximity_marketing/commit/5e23d3801e5c9a73f5dff64d4aa1b389bcf6bad7))
- add QR logo image upload and customize options for touch points ([3f176fd](https://github.com/QQuik/quik_proximity_marketing/commit/3f176fda1ff5f758b74958f6db21c3235a7867e4))
- add real api into advanced analytic ([#359](https://github.com/QQuik/quik_proximity_marketing/issues/359)) ([1324db1](https://github.com/QQuik/quik_proximity_marketing/commit/1324db175155458d5318b07fe829226ae49fac11))
- add service-to-service authentication with API key validation ([#432](https://github.com/QQuik/quik_proximity_marketing/issues/432)) ([29ec851](https://github.com/QQuik/quik_proximity_marketing/commit/29ec8518c555bad37af77bdde2f86e1362268199))
- add timezone ([#348](https://github.com/QQuik/quik_proximity_marketing/issues/348)) ([b2112f3](https://github.com/QQuik/quik_proximity_marketing/commit/b2112f3ae964103e98d3eccece0eb1d3a6746328))
- add token refresh handling and QR code URL tracking parameter ([4b3148d](https://github.com/QQuik/quik_proximity_marketing/commit/4b3148d4a2709d50bd0aa5a29e604eee0343d223))
- create qr svg when user create tp ([199eb61](https://github.com/QQuik/quik_proximity_marketing/commit/199eb617138f3a6cd564c9b87cd589dec7efc0bf))
- enhance CreateDomainForm and API response structure with improved error handling and new types ([b8e13a5](https://github.com/QQuik/quik_proximity_marketing/commit/b8e13a51f836fcf7f34dea0c9dfdfb190ebe0d9b))
- enhance error handling in touch point creation with rollback and localized messages ([ab889ac](https://github.com/QQuik/quik_proximity_marketing/commit/ab889ac9a397392327991997d2cfb7ebae04e314))
- implement activity line chart with daily trend visualization and analytics ([#360](https://github.com/QQuik/quik_proximity_marketing/issues/360)) ([7535f4c](https://github.com/QQuik/quik_proximity_marketing/commit/7535f4c239b457ebe925859393bbe50ab303ae93))
- implement advanced analytics filtering with tags and touchpoints selection ([3cd7105](https://github.com/QQuik/quik_proximity_marketing/commit/3cd7105411a5bd0acaf6c9738376239bbadadbe8))
- implement advanced filter UI with tag and touchpoint selection ([128412d](https://github.com/QQuik/quik_proximity_marketing/commit/128412ddfca1a2187a477b3ea9678e54efaa8ec3))
- implement AI provider key rotation and caching system for slug generation ([4fbb948](https://github.com/QQuik/quik_proximity_marketing/commit/4fbb948a86fb2a369e7c661ce3f98cb42938253a))
- implement AI-powered slug generation with LiteLLM and Firecrawler integration ([cfd6035](https://github.com/QQuik/quik_proximity_marketing/commit/cfd603557c501316c54509a00b21b7868c744712))
- implement anon migration with pending touch points and user profile API ([#422](https://github.com/QQuik/quik_proximity_marketing/issues/422)) ([bd22dd9](https://github.com/QQuik/quik_proximity_marketing/commit/bd22dd9698ec67a76084dce2508b8fcd595cc143))
- implement anonymous touch points API with middleware and schema validation ([85f0217](https://github.com/QQuik/quik_proximity_marketing/commit/85f0217dd263a00bab558470ac1fb222afaf833c))
- implement anonymous touch points API with repository and service layers ([6bbb254](https://github.com/QQuik/quik_proximity_marketing/commit/6bbb254cd592e86959f8aad808dd5002e3f14624))
- implement auth refresh and logout endpoints with cookie management ([2947847](https://github.com/QQuik/quik_proximity_marketing/commit/294784782360d28fb4a7ca14c6f3c01bfeda7a58))
- implement CORS middleware with domain allowlist for public API endpoints ([55da9f6](https://github.com/QQuik/quik_proximity_marketing/commit/55da9f66e4aba8f56b3f216acb91f91e614217cf))
- implement i18n on api & zod ([#380](https://github.com/QQuik/quik_proximity_marketing/issues/380)) ([c6a47e8](https://github.com/QQuik/quik_proximity_marketing/commit/c6a47e8debc39c3ffb550c880063ae175af71d69))
- implement locale and timezone management with dayjs integration ([5843c0f](https://github.com/QQuik/quik_proximity_marketing/commit/5843c0f4b7c220b81b0e5ea78c42b856dbde8541))
- implement server-side timezone and locale handling with dayjs integration ([35841cf](https://github.com/QQuik/quik_proximity_marketing/commit/35841cff7947172880f83327032f2ee49fb34eb5))
- implement timezone handling across analytics and dashboard components ([e58fbbd](https://github.com/QQuik/quik_proximity_marketing/commit/e58fbbdaa587ab4d63ea06f3f7eb209739ac0593))
- limit active time range display to 3 hours in channel analysis ([05ff693](https://github.com/QQuik/quik_proximity_marketing/commit/05ff6935e69fad2313a72d067228396442fed061))
- limit anonymous users to 1 total touch point instead of 3 per day ([96ed895](https://github.com/QQuik/quik_proximity_marketing/commit/96ed895a73287a5db752c54d794cb8e89cca9afa))
- modify code & add hook & api for advanced analytics ([#355](https://github.com/QQuik/quik_proximity_marketing/issues/355)) ([e3f639c](https://github.com/QQuik/quik_proximity_marketing/commit/e3f639c36a90ac0d406cc45acc92fb6c29b35915))
- move custom domains to dedicated page and improve filter UI ([43aa0a3](https://github.com/QQuik/quik_proximity_marketing/commit/43aa0a317879bfb688e9744c37870959a482032a))
- realtime data tab ([#373](https://github.com/QQuik/quik_proximity_marketing/issues/373)) ([3f8d16f](https://github.com/QQuik/quik_proximity_marketing/commit/3f8d16fc680f6d4adc6122732af35413be89f77a))
- update ui version 1.0 for acquistions and hide the attribute override… ([#358](https://github.com/QQuik/quik_proximity_marketing/issues/358)) ([dc0ab5a](https://github.com/QQuik/quik_proximity_marketing/commit/dc0ab5aa43dd2ab483d99c9ffb3515988b02687a))

### 🐛 Bug Fixes

- 404 button ([#336](https://github.com/QQuik/quik_proximity_marketing/issues/336)) ([2989283](https://github.com/QQuik/quik_proximity_marketing/commit/29892831200c0bde453edf30d78edd03f66a96e3))
- add ts-ignore to suppress type error in QR color options update ([4aeaf58](https://github.com/QQuik/quik_proximity_marketing/commit/4aeaf586840a9bb74a95f81847daa0caceb6811e))
- adding type button to ai optimize btn ([#407](https://github.com/QQuik/quik_proximity_marketing/issues/407)) ([8ee1ab7](https://github.com/QQuik/quik_proximity_marketing/commit/8ee1ab72cb4993aac9beea0bef4ee19a9ff8588a))
- analytic advanced & some error ([baba42b](https://github.com/QQuik/quik_proximity_marketing/commit/baba42b1600f6dc2c05897808875df8aafbde1fd))
- build error by correct null check ([#369](https://github.com/QQuik/quik_proximity_marketing/issues/369)) ([5014422](https://github.com/QQuik/quik_proximity_marketing/commit/5014422e1d9f00fa06b99f3b4a4686a13897249e))
- change default qr logo and fix dayjs usage in tp list ([#480](https://github.com/QQuik/quik_proximity_marketing/issues/480)) ([801eb32](https://github.com/QQuik/quik_proximity_marketing/commit/801eb32b3ff7dda7177419d9a94f583e4053d152))
- change env & fix api for tags ([be08057](https://github.com/QQuik/quik_proximity_marketing/commit/be08057682be4fff39f21fde529d5d8fefcf64c9))
- **cicd:** fix semantic release ([4eeed0d](https://github.com/QQuik/quik_proximity_marketing/commit/4eeed0da39a7e0827041e5866e925c4f8c7879ab))
- **cicd:** release only on main ([ed6f583](https://github.com/QQuik/quik_proximity_marketing/commit/ed6f5831d7b82a7dc97717d5005ebbb983792888))
- copy qr on svg type ([1c25899](https://github.com/QQuik/quik_proximity_marketing/commit/1c25899e29bee1f9965cd3f3baa4925213324dab))
- create tp form ([71f12f1](https://github.com/QQuik/quik_proximity_marketing/commit/71f12f1d6553829754c6adccab186927ca87d2bb))
- dashboard crash by data undifined ([08c3110](https://github.com/QQuik/quik_proximity_marketing/commit/08c31101564785ae7385df4acfd0ed6b54a0afab))
- dockerfile for node-canvas ([c59ca22](https://github.com/QQuik/quik_proximity_marketing/commit/c59ca228a4fbb7a1f7ff830c7af2267fdb923c3e))
- domain not have https ([e6e973e](https://github.com/QQuik/quik_proximity_marketing/commit/e6e973e29ff3a757830a3ec5062a0c9c22626dc1))
- empty response message ([1c21bc8](https://github.com/QQuik/quik_proximity_marketing/commit/1c21bc8962c0b57adcebb8d04ddb8305dd2efbfe))
- ensure cookies are always deleted regardless of domain during logout ([1559620](https://github.com/QQuik/quik_proximity_marketing/commit/155962076fdefeb87a60cc0a645163570aeab831))
- env de ([6f365ca](https://github.com/QQuik/quik_proximity_marketing/commit/6f365caebb0b7d80dec84ff0289e8a3da0cc22bf))
- env local ([dc6c5c8](https://github.com/QQuik/quik_proximity_marketing/commit/dc6c5c864ae2d1eb4f9ae0dfe79bddc7f652d779))
- error on tree select ([9c2c974](https://github.com/QQuik/quik_proximity_marketing/commit/9c2c9748cdc00533f2e9f9957e5dbe6514466a5b))
- error when null data ([#371](https://github.com/QQuik/quik_proximity_marketing/issues/371)) ([8a3e97d](https://github.com/QQuik/quik_proximity_marketing/commit/8a3e97d1e7f5b3ce908c742abf9d70bc698ac91b))
- fix cicd & releaserc ([2882c87](https://github.com/QQuik/quik_proximity_marketing/commit/2882c87342b4c7bf3ae0ca19427ea0dc8322006e))
- fix error when null data fetching ([#370](https://github.com/QQuik/quik_proximity_marketing/issues/370)) ([2ef0f8b](https://github.com/QQuik/quik_proximity_marketing/commit/2ef0f8b66716fa8c7f911780db66840861f0b35e))
- fix metatag & utm tag logic ([48a10a8](https://github.com/QQuik/quik_proximity_marketing/commit/48a10a8bf3c4420075360290738460d35f145953))
- handle cookie domain for production environment in auth routes ([f7b1aaa](https://github.com/QQuik/quik_proximity_marketing/commit/f7b1aaa85a7cb57960395a290679b5ae6fee6aed))
- handle null createdTpId in rollback and improve type safety ([2c15143](https://github.com/QQuik/quik_proximity_marketing/commit/2c15143a3c35927f816fead761db75105c7bab92))
- heatmap hover ([f1cbdb2](https://github.com/QQuik/quik_proximity_marketing/commit/f1cbdb2c1ed163037731d9071f623c2ac3bb661a))
- heatmap wrong color ([59840c7](https://github.com/QQuik/quik_proximity_marketing/commit/59840c718f788f354f21562f2548f27e20f3d655))
- hide performance overview + back btn in tp detail ([63ec355](https://github.com/QQuik/quik_proximity_marketing/commit/63ec355645f08c5c19456fffd33c61fcdc818750))
- hot fix table rows ([ddc4500](https://github.com/QQuik/quik_proximity_marketing/commit/ddc4500a799a68adc5f592202d4fda06fa55c085))
- include 403 status in token refresh interceptor logic ([db1f155](https://github.com/QQuik/quik_proximity_marketing/commit/db1f1558323eaed7f92d899fd21600afd2da5892))
- mapping country not work ([88ed73f](https://github.com/QQuik/quik_proximity_marketing/commit/88ed73ff9e2ae6659bc1ff28f85cdb5711fb1ac4))
- metatag error ([7dbb596](https://github.com/QQuik/quik_proximity_marketing/commit/7dbb596a1fbfb6469d588e5b8af1424b1a7713ac))
- plan check for create tp anon ([a5c37f0](https://github.com/QQuik/quik_proximity_marketing/commit/a5c37f005da0198b43ebb7184fd0df703994f605))
- profile service ([#390](https://github.com/QQuik/quik_proximity_marketing/issues/390)) ([8c4bcba](https://github.com/QQuik/quik_proximity_marketing/commit/8c4bcba273ea35c8c966696b70efc57d52327520))
- qr spam update in tp update page ([326d38a](https://github.com/QQuik/quik_proximity_marketing/commit/326d38ae54b9534664e9e554bbec824317581fe6))
- qr-customize-in-app-load-wrong-options by remove hard code color ([#417](https://github.com/QQuik/quik_proximity_marketing/issues/417)) ([4f1c5a5](https://github.com/QQuik/quik_proximity_marketing/commit/4f1c5a58f305e4878ea8f8b3b653e0e32fd76e6b))
- querykey tag detail ([#457](https://github.com/QQuik/quik_proximity_marketing/issues/457)) ([3478fd2](https://github.com/QQuik/quik_proximity_marketing/commit/3478fd23ab77b5c7c832c69c67c0c7b6122ca3a5))
- reduce use effect qr render ([#427](https://github.com/QQuik/quik_proximity_marketing/issues/427)) ([ad7d397](https://github.com/QQuik/quik_proximity_marketing/commit/ad7d3976ddbb70d99fad6b345bdf2a7274b23e5c))
- refresh token error ([4284e2c](https://github.com/QQuik/quik_proximity_marketing/commit/4284e2ce41da3965a80ebc5fb131f7e8a39965ab))
- refresh token make duplicate cookie ([a7a8b65](https://github.com/QQuik/quik_proximity_marketing/commit/a7a8b653cbe06bd1c33f5c958ccb6be4417055a9))
- remove eval for security ([#464](https://github.com/QQuik/quik_proximity_marketing/issues/464)) ([d450cd9](https://github.com/QQuik/quik_proximity_marketing/commit/d450cd91385600dc31e1e523c55a741b4a6a0153))
- remove react context ([9748616](https://github.com/QQuik/quik_proximity_marketing/commit/9748616ea8956b1bee29ca89cbda6cfc5207ca17))
- show full QR customization form when QR code is dirty ([61ffd42](https://github.com/QQuik/quik_proximity_marketing/commit/61ffd42b26fcab5c6e9c79adf5759a88180c6d97))
- skip domain-based cookie deletion in development environment ([9ade6e7](https://github.com/QQuik/quik_proximity_marketing/commit/9ade6e78debe184cd070c712cccdb4ce7db7287b))
- suspense on acquisitions tab ([62df083](https://github.com/QQuik/quik_proximity_marketing/commit/62df08367024bc69cefd1d94304753afd30a6a35))
- tag errors ([603b7e5](https://github.com/QQuik/quik_proximity_marketing/commit/603b7e5ecd3f93ef0b42a12219677c2ca92939c4))
- tags error on macos ([403fab6](https://github.com/QQuik/quik_proximity_marketing/commit/403fab61462f8b230aa7dd373b7c186ac7f9c1a5))
- tp logic ([83ae675](https://github.com/QQuik/quik_proximity_marketing/commit/83ae675795b6834b2fc21f93a3ce708dfd08882e))
- ts error on blob type ([38c4a60](https://github.com/QQuik/quik_proximity_marketing/commit/38c4a60d085525a8e237330f3f9bb81ab10c05dd))
- typescript error ([abec86b](https://github.com/QQuik/quik_proximity_marketing/commit/abec86b8eb6d38108b7d92c4ed29f8de487b6d59))
- typescript error on blob type ([deea737](https://github.com/QQuik/quik_proximity_marketing/commit/deea7374861286cf4433bcf4a1f568de34ea2026))
- ui update for dashboard ([4f3498a](https://github.com/QQuik/quik_proximity_marketing/commit/4f3498a901156457b15cbd435f3fa788c1c607d0))
- update dependabot config to use npm instead of yarn package ecosystem ([62bc715](https://github.com/QQuik/quik_proximity_marketing/commit/62bc715b3f2ea7034dba21e86d9e699a8df9f7c8))
- update Docker dependencies for node-canvas and add ts-ignore comments for type safety ([a93fe19](https://github.com/QQuik/quik_proximity_marketing/commit/a93fe1926648a428f30ea644eeffe9b5cb0af986))
- update Dockerfile to properly install node-canvas dependencies in base image ([8587468](https://github.com/QQuik/quik_proximity_marketing/commit/858746885afb35fec2006d3a5befa2703d4f5fb0))
- update mail queue ([4f2b81c](https://github.com/QQuik/quik_proximity_marketing/commit/4f2b81c1c2b900fdc5a1e2fa1bc7d1304ceeeaa7))
- update SameSite cookie attribute from None to Lax for auth tokens ([09edd47](https://github.com/QQuik/quik_proximity_marketing/commit/09edd4756335045ad09096c30f7ab60d887d9ae3))
- update short_url to use environment variable for base URL ([ac0dfe2](https://github.com/QQuik/quik_proximity_marketing/commit/ac0dfe220b3825d17775ff704069d39a53202eaf))
- update to using app error and check empty in advanced analytic ([#386](https://github.com/QQuik/quik_proximity_marketing/issues/386)) ([1dcf292](https://github.com/QQuik/quik_proximity_marketing/commit/1dcf2926f35abead1f14723d2a2ad7be203d825e))
- use full domain with shortcode instead of shortUrl for QR code generation ([24c8a9f](https://github.com/QQuik/quik_proximity_marketing/commit/24c8a9fe1360df32f4a2c7d3e5b0318ee7bddd94))
- use QR customization options from created touch point instead of default options ([bd816a2](https://github.com/QQuik/quik_proximity_marketing/commit/bd816a298a75493a567a4a0004f5d55e81a6d9da))
- using session to get user in update Profile and remove console… ([#389](https://github.com/QQuik/quik_proximity_marketing/issues/389)) ([e0b20c2](https://github.com/QQuik/quik_proximity_marketing/commit/e0b20c26da9438bdf6784b21462d7f002440c502))
- workflow ([e21d618](https://github.com/QQuik/quik_proximity_marketing/commit/e21d6180a98b5a4493efb0613aadd86108cff7b0))
- wrap ArrayBuffer in Uint8Array when creating Blob/File for QR code images ([cfccb09](https://github.com/QQuik/quik_proximity_marketing/commit/cfccb09cad9767c3b30947a23a4e5cd6c552d1b5))
- wrong logic when add tp into tag ([7af645f](https://github.com/QQuik/quik_proximity_marketing/commit/7af645f1eef7bab343e0d20fe85d98bd0b32d294))
- yarn build error ([52c7885](https://github.com/QQuik/quik_proximity_marketing/commit/52c78855ef687f61dd4db44afef79d0bda021b24))

### 🛠 Updates

- add api call for acquistion ([#361](https://github.com/QQuik/quik_proximity_marketing/issues/361)) ([91adbfc](https://github.com/QQuik/quik_proximity_marketing/commit/91adbfcbad43dc55de85ea3fa35a54c2350afcea))
- add copy btn in qr result ([e9ca6b0](https://github.com/QQuik/quik_proximity_marketing/commit/e9ca6b0889fc63d4a6f5541c889d3a515e64ac65))
- adding feature export tp file ([#418](https://github.com/QQuik/quik_proximity_marketing/issues/418)) ([c8068df](https://github.com/QQuik/quik_proximity_marketing/commit/c8068df90ac147c53586b51b2e1677249b93a269))
- adding null check for some maps and remove Empty section, change it to null instead for reduce misunderstanding, apply tabs for Audience ([#366](https://github.com/QQuik/quik_proximity_marketing/issues/366)) ([cb0bf5f](https://github.com/QQuik/quik_proximity_marketing/commit/cb0bf5f84dad03fb24e7733dc1eb319817d8f162))
- adding null check for tabs ([#368](https://github.com/QQuik/quik_proximity_marketing/issues/368)) ([d894cd2](https://github.com/QQuik/quik_proximity_marketing/commit/d894cd265a3b5d1a2cb20f81e00b39ba661e9147))
- Adding placholder for empty data chart ([#372](https://github.com/QQuik/quik_proximity_marketing/issues/372)) ([9834143](https://github.com/QQuik/quik_proximity_marketing/commit/983414350dd696c641e3d5d0e4613fdb56f92f3c))
- adding zod translation ([#382](https://github.com/QQuik/quik_proximity_marketing/issues/382)) ([9d3caab](https://github.com/QQuik/quik_proximity_marketing/commit/9d3caabb43c12c82796f35a72fe9e1a58c34ccf8))
- advanced analytic UI v0.1 ([#352](https://github.com/QQuik/quik_proximity_marketing/issues/352)) ([17d935f](https://github.com/QQuik/quik_proximity_marketing/commit/17d935f214f37653c025932630ec9446222428ea))
- advanced analytic UI v0.2 ([#353](https://github.com/QQuik/quik_proximity_marketing/issues/353)) ([687c942](https://github.com/QQuik/quik_proximity_marketing/commit/687c9421088fa9a0af7393b0db2b72369a96191e))
- ai slug UI v2.1 ([#412](https://github.com/QQuik/quik_proximity_marketing/issues/412)) ([aa2b1a7](https://github.com/QQuik/quik_proximity_marketing/commit/aa2b1a7642c805088b9c6d3322035afff9a7f165))
- ai UI slug with design ([#408](https://github.com/QQuik/quik_proximity_marketing/issues/408)) ([8f4a6ff](https://github.com/QQuik/quik_proximity_marketing/commit/8f4a6ff056cb72c491f9608f4b1a89586361d55c))
- app sidebar v0.1 ([#425](https://github.com/QQuik/quik_proximity_marketing/issues/425)) ([6217700](https://github.com/QQuik/quik_proximity_marketing/commit/621770089b2af28a9018c807d01eab70e2f10094))
- arrow back and log out button ([#415](https://github.com/QQuik/quik_proximity_marketing/issues/415)) ([636b926](https://github.com/QQuik/quik_proximity_marketing/commit/636b92689e34c0c77a7321d3e281ae92a08f79f8))
- auto switch tab to qr code if generate by create qr code ([#463](https://github.com/QQuik/quik_proximity_marketing/issues/463)) ([e65bea3](https://github.com/QQuik/quik_proximity_marketing/commit/e65bea3aa8ad5e0794da64fed6dd57d0ed91d99c))
- change default options of qr to match with qr in landing page ([#413](https://github.com/QQuik/quik_proximity_marketing/issues/413)) ([519ca2b](https://github.com/QQuik/quik_proximity_marketing/commit/519ca2b885f0e6d28005a6b904fb6925ec0de7db))
- change default url ([#474](https://github.com/QQuik/quik_proximity_marketing/issues/474)) ([2cb735f](https://github.com/QQuik/quik_proximity_marketing/commit/2cb735f46f01adb61bcb02ba6fdbacf73adc52a7))
- change li2con from png to svg ([#340](https://github.com/QQuik/quik_proximity_marketing/issues/340)) ([0349e3e](https://github.com/QQuik/quik_proximity_marketing/commit/0349e3ec84dcc40e268ee74d44f7493860830c2e))
- change logic of validate desination ([dbf3e00](https://github.com/QQuik/quik_proximity_marketing/commit/dbf3e006545fcdd541718b6be4006edf7ce6e04b))
- change text top performing and rename file ([#342](https://github.com/QQuik/quik_proximity_marketing/issues/342)) ([2a01c43](https://github.com/QQuik/quik_proximity_marketing/commit/2a01c4393bc010a80170f696c3110b1abde3d774))
- code syntax ([#465](https://github.com/QQuik/quik_proximity_marketing/issues/465)) ([80ab7ad](https://github.com/QQuik/quik_proximity_marketing/commit/80ab7ad4b1c330014df668da3e66d192eecdd637))
- create tp with advance custom customize ([#454](https://github.com/QQuik/quik_proximity_marketing/issues/454)) ([f34dee4](https://github.com/QQuik/quik_proximity_marketing/commit/f34dee43ec5577e65aecd6a09b80bf13ccc3b34d))
- dashboard new UI ([#429](https://github.com/QQuik/quik_proximity_marketing/issues/429)) ([3fac90a](https://github.com/QQuik/quik_proximity_marketing/commit/3fac90a92fd1224c33cb36b41eab37afb28b79e1))
- display one month selection for mobile calendar ([#341](https://github.com/QQuik/quik_proximity_marketing/issues/341)) ([ba22f30](https://github.com/QQuik/quik_proximity_marketing/commit/ba22f30d46cc0a9f1bf4831937c3f7f2f599454c))
- filter for advanced analytic ([#393](https://github.com/QQuik/quik_proximity_marketing/issues/393)) ([7528be5](https://github.com/QQuik/quik_proximity_marketing/commit/7528be5fe9a026b1b4a51d654dff9a05f6198cc1))
- fix and create new tp v0.1 ([#453](https://github.com/QQuik/quik_proximity_marketing/issues/453)) ([54ec83f](https://github.com/QQuik/quik_proximity_marketing/commit/54ec83f19639735c3ae846574a738c0323139091))
- fix bugs based on error found ([a389762](https://github.com/QQuik/quik_proximity_marketing/commit/a389762dc80a068f880a95ab5d8e7273e821f4a3))
- import file validate data ([#406](https://github.com/QQuik/quik_proximity_marketing/issues/406)) ([1eab054](https://github.com/QQuik/quik_proximity_marketing/commit/1eab0542ca295b978e16b9393453288809bc64b0))
- improve UI dashboard & save qr image when insert/update tp ([#439](https://github.com/QQuik/quik_proximity_marketing/issues/439)) ([b366ca0](https://github.com/QQuik/quik_proximity_marketing/commit/b366ca072ffbda052b868e77c1a099c6e626919d))
- list qr and shortlink ([#436](https://github.com/QQuik/quik_proximity_marketing/issues/436)) ([f9f80ba](https://github.com/QQuik/quik_proximity_marketing/commit/f9f80ba820b191c40faf8f693ba28ddefa7c0797))
- missing code from cherry pick for linechart and heatmap ([#395](https://github.com/QQuik/quik_proximity_marketing/issues/395)) ([5cf5558](https://github.com/QQuik/quik_proximity_marketing/commit/5cf5558df5569df98752367cabb768cb536ae045))
- move dev from release into pre-release ([0f7415f](https://github.com/QQuik/quik_proximity_marketing/commit/0f7415f9fb08f5ac57bdf13618776d21326c73e2))
- qr options client ([#445](https://github.com/QQuik/quik_proximity_marketing/issues/445)) ([1b5d23a](https://github.com/QQuik/quik_proximity_marketing/commit/1b5d23a8ebf9afaf8919eedfdc61a746bdeb5c1d))
- querykey for tag detail and max character display for name tp… ([#456](https://github.com/QQuik/quik_proximity_marketing/issues/456)) ([9349668](https://github.com/QQuik/quik_proximity_marketing/commit/934966816a16e3a6ad7b37c2b3d6c911451b2a3b))
- remove package next server ([#462](https://github.com/QQuik/quik_proximity_marketing/issues/462)) ([4b30473](https://github.com/QQuik/quik_proximity_marketing/commit/4b304735f8178f18e5905879ac4e4d95deef1167))
- remove unused import and add maw-width for right image in meta tags ([#337](https://github.com/QQuik/quik_proximity_marketing/issues/337)) ([a8d684c](https://github.com/QQuik/quik_proximity_marketing/commit/a8d684ce0f34865acdab03250b298702eba466fe))
- setup AI Optimize Slug UI version 1.0, still missing AI Recom… ([#396](https://github.com/QQuik/quik_proximity_marketing/issues/396)) ([a995765](https://github.com/QQuik/quik_proximity_marketing/commit/a995765bd4662ae2a762a600bfe029ecb09dfa1e))
- slug generation prompt ([#405](https://github.com/QQuik/quik_proximity_marketing/issues/405)) ([023c55b](https://github.com/QQuik/quik_proximity_marketing/commit/023c55b3f40812beda8cde054d6a71affd07ab7e))
- text remove download shortlink list ([#444](https://github.com/QQuik/quik_proximity_marketing/issues/444)) ([1a0ab8f](https://github.com/QQuik/quik_proximity_marketing/commit/1a0ab8f2755a12ff9906f7000471777a32b9cc9f))
- translation and tag badges ([#448](https://github.com/QQuik/quik_proximity_marketing/issues/448)) ([494d7f1](https://github.com/QQuik/quik_proximity_marketing/commit/494d7f1ff5dfb1054c55baed56509cc0564a948a))
- translation files ([#381](https://github.com/QQuik/quik_proximity_marketing/issues/381)) ([6c6c91b](https://github.com/QQuik/quik_proximity_marketing/commit/6c6c91b2f885358de46de17735c1dcecaf27f5ff))
- ui change padding & slug schema ([#455](https://github.com/QQuik/quik_proximity_marketing/issues/455)) ([7b9963b](https://github.com/QQuik/quik_proximity_marketing/commit/7b9963bcdee37611cb5618f6e8498d85ff7e4789))
- update skeleton for lazy load components ([dec8173](https://github.com/QQuik/quik_proximity_marketing/commit/dec817393885afe3d1628f38d9580f4ee5df8b01))
- upgrade chart version ([57eaa2d](https://github.com/QQuik/quik_proximity_marketing/commit/57eaa2d17bae3fdcca8b3b55c7c2969bd52d39c7))
- using iconLeft instead of using children ([#458](https://github.com/QQuik/quik_proximity_marketing/issues/458)) ([e18def7](https://github.com/QQuik/quik_proximity_marketing/commit/e18def7263b9f9eb88488703d82d792eb2777d8d))

### ♻️ Code Refactoring

- components into features ([#362](https://github.com/QQuik/quik_proximity_marketing/issues/362)) ([17b5798](https://github.com/QQuik/quik_proximity_marketing/commit/17b57986fac8a48228e2e226af98e8eb5252c695))
- implement CORS middleware with enhanced security and caching headers ([9ffa50f](https://github.com/QQuik/quik_proximity_marketing/commit/9ffa50f0c652e6236ccff2174e5f17d2df674b1e))
- improve error handling and type safety in premium grant callback ([f86c134](https://github.com/QQuik/quik_proximity_marketing/commit/f86c1341f7aa184b0e1ce4ca94209189c47f44b4))
- improve file upload validation and error handling for CSV imports ([#409](https://github.com/QQuik/quik_proximity_marketing/issues/409)) ([692f058](https://github.com/QQuik/quik_proximity_marketing/commit/692f05829fd2d54481053ead07ee7a0182f3cff3))
- migrate from CampaignContentType to TouchPointContentType enum ([c89f26b](https://github.com/QQuik/quik_proximity_marketing/commit/c89f26b639a1e775aa8b12cb6618d19db70c2031))
- move assets into more structural place ([#347](https://github.com/QQuik/quik_proximity_marketing/issues/347)) ([2c3fac3](https://github.com/QQuik/quik_proximity_marketing/commit/2c3fac34e6703c1268d40784eaf90c3f7d547274))
- move logic tp delete & tp create into core ([fbeb3f7](https://github.com/QQuik/quik_proximity_marketing/commit/fbeb3f79fa165687f60df9787400f0c597698e88))
- project structure ([#343](https://github.com/QQuik/quik_proximity_marketing/issues/343)) ([d4d601d](https://github.com/QQuik/quik_proximity_marketing/commit/d4d601dd5dfaafae57c3dfb4805d755ff99aaf47))
- remove loading state and spinner from QR code rendering component ([e1be078](https://github.com/QQuik/quik_proximity_marketing/commit/e1be0781ce233128097a50adb4f088a4e6c510d8))
- reorganize Dockerfile layers and enhance button component with icon positioning support ([e85b063](https://github.com/QQuik/quik_proximity_marketing/commit/e85b063cbcf2a8e63f22e64614e51ccd9068cb9f))
- repo service profile userplan ([#349](https://github.com/QQuik/quik_proximity_marketing/issues/349)) ([6b49180](https://github.com/QQuik/quik_proximity_marketing/commit/6b491805a020ca40a65d01293fed9aca0564c9e7))
- restructure codebase based features ([#363](https://github.com/QQuik/quik_proximity_marketing/issues/363)) ([849cbc0](https://github.com/QQuik/quik_proximity_marketing/commit/849cbc06703e9d633714ca519893e5bd21261dad))
- simplify touch point creation and update Redis password handling ([64544db](https://github.com/QQuik/quik_proximity_marketing/commit/64544db5beed8df67baa00a03dea7dda707ea7a3))
- touch point create api ([108549d](https://github.com/QQuik/quik_proximity_marketing/commit/108549dd01ad3ae14f88fb04085a1b703e0a05b8))
- touch point module into core ([#350](https://github.com/QQuik/quik_proximity_marketing/issues/350)) ([aaed4a0](https://github.com/QQuik/quik_proximity_marketing/commit/aaed4a01aa91ed0b4d470c1e18aca6c190835267))
- upgrade tailwind to v4 ([#473](https://github.com/QQuik/quik_proximity_marketing/issues/473)) ([6ee8dab](https://github.com/QQuik/quik_proximity_marketing/commit/6ee8dab91513df98f3708d13d11c0aaf7f10a8d0))
- use provided message as default error message instead of hardcoded strings ([e8188ac](https://github.com/QQuik/quik_proximity_marketing/commit/e8188acbfea5594734244217045099b3cce2b98e))

### Chore

- add dependabot configuration for daily yarn package updates ([c958da8](https://github.com/QQuik/quik_proximity_marketing/commit/c958da8ce0b0daae049d9de5c4b597648efd5e8d))
- add encrypted development environment variables ([2bbf745](https://github.com/QQuik/quik_proximity_marketing/commit/2bbf7450d096cdb9f590a322de4f1724e9cdad2a))
- add log into dashboard route ([a537cd4](https://github.com/QQuik/quik_proximity_marketing/commit/a537cd4960d0551b6884a7571e2ca934807d0c34))
- add log into dashboard route ([719585b](https://github.com/QQuik/quik_proximity_marketing/commit/719585b6220eeabf8aecd479a3d51eefa614a516))
- add log into dashboard route ([94d3466](https://github.com/QQuik/quik_proximity_marketing/commit/94d3466b3b1d4b02b0c9f32232c839fad732584f))
- add log into refresh token for debug ([fb4b22d](https://github.com/QQuik/quik_proximity_marketing/commit/fb4b22d353fe76156ba250d4921b083f827e566e))
- add sourcemap to debug ([65434f9](https://github.com/QQuik/quik_proximity_marketing/commit/65434f9a9e1be50a8cb0e1424dde13f2c73c23fb))
- adding animation bounce update qr realtime interactions tabs double re render qr safari ([#420](https://github.com/QQuik/quik_proximity_marketing/issues/420)) ([6f26dc8](https://github.com/QQuik/quik_proximity_marketing/commit/6f26dc89c3407e7114beac969222a527739ba28e))
- adding redis event key push file ([#423](https://github.com/QQuik/quik_proximity_marketing/issues/423)) ([f571ae1](https://github.com/QQuik/quik_proximity_marketing/commit/f571ae19b12b49b55ef447f8e237346d80d64584))
- change text Analytic By Tag -> Basic Analytics ([b5b3ff3](https://github.com/QQuik/quik_proximity_marketing/commit/b5b3ff386282152fb7e982668358aacb76a656a9))
- **cicd:** add action to gemini review ([7b66448](https://github.com/QQuik/quik_proximity_marketing/commit/7b664488b3a75ebf8d0a980ecd9704e4d00e6b32))
- **cicd:** add action to gemini review ([22c780a](https://github.com/QQuik/quik_proximity_marketing/commit/22c780adbe6f54717ed234ecced04e7810b551c4))
- **cicd:** add sonar for workflow ([#459](https://github.com/QQuik/quik_proximity_marketing/issues/459)) ([d228fc3](https://github.com/QQuik/quik_proximity_marketing/commit/d228fc39d8aad3212748c85977183fee570efc1d))
- **cicd:** change workflow ([b0faaf6](https://github.com/QQuik/quik_proximity_marketing/commit/b0faaf6b427f28ceebfa878fc5ab0c6625f04e16))
- **cicd:** put sonar to PR only ([0812e79](https://github.com/QQuik/quik_proximity_marketing/commit/0812e796cf3cc35870a8969d647bfe0dc0dfc2c6))
- **cicd:** remove gemini review ([de6936d](https://github.com/QQuik/quik_proximity_marketing/commit/de6936d0d384f900f430ded7ddf215280b3d1620))
- **cicd:** update gemini model for review PR ([7b378d7](https://github.com/QQuik/quik_proximity_marketing/commit/7b378d734c174bc4405777924f55c30adf74a467))
- **cicd:** update gemini model for review PR ([d7e40e0](https://github.com/QQuik/quik_proximity_marketing/commit/d7e40e05a8e445134ea9c9a7b83c17932f077c49))
- disable auto meta tag generation for touch points ([cd6925d](https://github.com/QQuik/quik_proximity_marketing/commit/cd6925dc5731f1f6f6b1a000f5f28f202f51705d))
- disable auto meta tag generation for touch points ([7f46915](https://github.com/QQuik/quik_proximity_marketing/commit/7f4691515bc16b06f7b9420cda79052d7fa952fe))
- disable auto meta tags functionality in touch point service ([012693f](https://github.com/QQuik/quik_proximity_marketing/commit/012693f45aa086929ea62ab9fa3193ffc3920fd9))
- disable gen ai slug button and update translation file for ai … ([#421](https://github.com/QQuik/quik_proximity_marketing/issues/421)) ([a79df44](https://github.com/QQuik/quik_proximity_marketing/commit/a79df44f5958fa6a2668ac0acc440b5e975349b3))
- downgrade typescript to major version 5 ([c299a04](https://github.com/QQuik/quik_proximity_marketing/commit/c299a04506b67cd06c66d983a895561c3d9b1afb))
- exclude yarn.lock from review ([3a21e86](https://github.com/QQuik/quik_proximity_marketing/commit/3a21e869b86d065287a8eccf87a56e23dafc35e7))
- exclude yarn.lock from review ([ebbd182](https://github.com/QQuik/quik_proximity_marketing/commit/ebbd182a1cc9b013122c9e40bdde3f29fdff5543))
- fix text analytic visitors -> total ([32da4c6](https://github.com/QQuik/quik_proximity_marketing/commit/32da4c6af9bede8dfa4d4bfb3c5f6e9aa82318bd))
- just release on main ([b694a32](https://github.com/QQuik/quik_proximity_marketing/commit/b694a323ac1395b3340802018fe2a6018b28b737))
- **release:** 1.0.2-development.1 [skip ci] ([f11961c](https://github.com/QQuik/quik_proximity_marketing/commit/f11961c40c8d7b074fc1723f70e785b7779647ac))
- **release:** 1.0.2-development.2 [skip ci] ([9421abd](https://github.com/QQuik/quik_proximity_marketing/commit/9421abd65f77fed2f388d929fb2e4da73b2f4797))
- **release:** 1.0.2-development.3 [skip ci] ([db1465f](https://github.com/QQuik/quik_proximity_marketing/commit/db1465f7d8b0e004a6254a47d8a2a48645b6826e))
- **release:** 1.0.2-development.4 [skip ci] ([947d71b](https://github.com/QQuik/quik_proximity_marketing/commit/947d71b1086a781010bc9fb5f98083dd1a20b8b0))
- **release:** 1.0.2-development.5 [skip ci] ([b86fe6a](https://github.com/QQuik/quik_proximity_marketing/commit/b86fe6a80ae621add807ab48ed2d25b7ced6bf96))
- **release:** 1.1.0 [skip ci] ([089c89e](https://github.com/QQuik/quik_proximity_marketing/commit/089c89e77d94014b67c9a355ab91bceef81e9678))
- **release:** 1.1.0 [skip ci] ([eb39e34](https://github.com/QQuik/quik_proximity_marketing/commit/eb39e34d038b80ab84d72ae25a3d1cd506cc7cb7))
- **release:** 1.1.0 [skip ci] ([dfcdbcb](https://github.com/QQuik/quik_proximity_marketing/commit/dfcdbcb77c3e73dce694fcc5c0a6dba937c77c73))
- **release:** 1.1.0 [skip ci] ([a7acd04](https://github.com/QQuik/quik_proximity_marketing/commit/a7acd04da28f8a5b755933baeb5b8eba9d71d06a))
- **release:** 1.1.0 [skip ci] ([ab614bb](https://github.com/QQuik/quik_proximity_marketing/commit/ab614bbb0df1c403d711009fa7d974be43994e6f))
- **release:** 1.1.0 [skip ci] ([174439d](https://github.com/QQuik/quik_proximity_marketing/commit/174439d878cd770f68f26b2ce1e5fbd0ce22262d))
- **release:** 1.1.0 [skip ci] ([d7d4365](https://github.com/QQuik/quik_proximity_marketing/commit/d7d4365ad6cda9c551c5a9921f08df643cadcf36))
- **release:** 1.1.0-development.1 [skip ci] ([aa757c7](https://github.com/QQuik/quik_proximity_marketing/commit/aa757c7434563cd45db9e79db7846a0d3b9ce819))
- **release:** 1.1.0-development.10 [skip ci] ([ac730b5](https://github.com/QQuik/quik_proximity_marketing/commit/ac730b52256d7496eaa25695b06f15814a098814))
- **release:** 1.1.0-development.11 [skip ci] ([edd6605](https://github.com/QQuik/quik_proximity_marketing/commit/edd66053b9e6b2428f055271fbe64a5094b0eb96))
- **release:** 1.1.0-development.12 [skip ci] ([8ec2589](https://github.com/QQuik/quik_proximity_marketing/commit/8ec2589ae97bd6068869d4b400e3144f928c71fe))
- **release:** 1.1.0-development.13 [skip ci] ([ec92a43](https://github.com/QQuik/quik_proximity_marketing/commit/ec92a435197994a1874baf51e492fb71518a9eee))
- **release:** 1.1.0-development.14 [skip ci] ([b4fc66c](https://github.com/QQuik/quik_proximity_marketing/commit/b4fc66cd2d8a5969a2571b401c15daa7b6dfe836))
- **release:** 1.1.0-development.15 [skip ci] ([db85d96](https://github.com/QQuik/quik_proximity_marketing/commit/db85d96758eadba5d8b8fc77409e52b8080ca24e))
- **release:** 1.1.0-development.16 [skip ci] ([cddcb6b](https://github.com/QQuik/quik_proximity_marketing/commit/cddcb6b1f6d25744fc08f318ba2a9e0712a00bb1))
- **release:** 1.1.0-development.17 [skip ci] ([634b66b](https://github.com/QQuik/quik_proximity_marketing/commit/634b66bc9c5a69f9dda5924bd48c4c610410b435))
- **release:** 1.1.0-development.18 [skip ci] ([33c3f90](https://github.com/QQuik/quik_proximity_marketing/commit/33c3f903f26d546419b9c4eae831153a67204c35))
- **release:** 1.1.0-development.19 [skip ci] ([77b5687](https://github.com/QQuik/quik_proximity_marketing/commit/77b56870a026b21d56576e83ac8e0f5d5735bd22))
- **release:** 1.1.0-development.2 [skip ci] ([5dc3ab8](https://github.com/QQuik/quik_proximity_marketing/commit/5dc3ab81efc081924994fb4e0dbc5c34e42d3508))
- **release:** 1.1.0-development.20 [skip ci] ([d61efa7](https://github.com/QQuik/quik_proximity_marketing/commit/d61efa7429e69a91407cf4ca3aa02ab22f00bff0))
- **release:** 1.1.0-development.21 [skip ci] ([41bf92b](https://github.com/QQuik/quik_proximity_marketing/commit/41bf92bdb4aabaecd0cd0540cce5621e764aeb07))
- **release:** 1.1.0-development.22 [skip ci] ([11ba010](https://github.com/QQuik/quik_proximity_marketing/commit/11ba0109563ce89a091d0b9266d8b0daeb8d632f))
- **release:** 1.1.0-development.23 [skip ci] ([d292094](https://github.com/QQuik/quik_proximity_marketing/commit/d29209492b57450a441f911cf954fc9d33b065e2))
- **release:** 1.1.0-development.24 [skip ci] ([8c46aec](https://github.com/QQuik/quik_proximity_marketing/commit/8c46aec05408a294177fc636b5bbb77f31ce8ec7))
- **release:** 1.1.0-development.25 [skip ci] ([067630e](https://github.com/QQuik/quik_proximity_marketing/commit/067630e8b79848affd3f2b89fdb510744c7b3341))
- **release:** 1.1.0-development.26 [skip ci] ([18ed4fa](https://github.com/QQuik/quik_proximity_marketing/commit/18ed4fa9be3bc674ce7db8ab5b7beca9b583ca7a))
- **release:** 1.1.0-development.27 [skip ci] ([953a743](https://github.com/QQuik/quik_proximity_marketing/commit/953a743dcabacbc8901fe6c92e05bb710406459a))
- **release:** 1.1.0-development.28 [skip ci] ([441a6d7](https://github.com/QQuik/quik_proximity_marketing/commit/441a6d7211122457d76b821ba4e722c6df422898))
- **release:** 1.1.0-development.29 [skip ci] ([28c3bd4](https://github.com/QQuik/quik_proximity_marketing/commit/28c3bd469654fbb859693edbc39f7ff2f4441d11))
- **release:** 1.1.0-development.3 [skip ci] ([3e1fa05](https://github.com/QQuik/quik_proximity_marketing/commit/3e1fa05c584834a1910264be180b08ff8df9da51))
- **release:** 1.1.0-development.30 [skip ci] ([6a7b004](https://github.com/QQuik/quik_proximity_marketing/commit/6a7b004031e88e618d685868046c349de74ab271))
- **release:** 1.1.0-development.31 [skip ci] ([1f15e2d](https://github.com/QQuik/quik_proximity_marketing/commit/1f15e2dddd3126c0b00c11e435308f406d41d448))
- **release:** 1.1.0-development.32 [skip ci] ([cc60e10](https://github.com/QQuik/quik_proximity_marketing/commit/cc60e102df67af27d2f27c7b4f4f78b4cc77ab6b))
- **release:** 1.1.0-development.33 [skip ci] ([519cd33](https://github.com/QQuik/quik_proximity_marketing/commit/519cd3359339ad50a7e74852ad8ee7e8e4c816ce))
- **release:** 1.1.0-development.34 [skip ci] ([dfd2460](https://github.com/QQuik/quik_proximity_marketing/commit/dfd24602c2ebce32e46f29c7fa1f980b2b204370))
- **release:** 1.1.0-development.35 [skip ci] ([9ec6003](https://github.com/QQuik/quik_proximity_marketing/commit/9ec60034af04a8b22ecf2d61a42accc15c9d8079))
- **release:** 1.1.0-development.36 [skip ci] ([0c21524](https://github.com/QQuik/quik_proximity_marketing/commit/0c2152469b719e522c15b7a59c92a4246ef9efb5))
- **release:** 1.1.0-development.37 [skip ci] ([a967741](https://github.com/QQuik/quik_proximity_marketing/commit/a967741b1338114502ce980f072c0d34f6aa6be6))
- **release:** 1.1.0-development.38 [skip ci] ([b727d2a](https://github.com/QQuik/quik_proximity_marketing/commit/b727d2a0e995d63b7ed3de3b3725b888afaf5433))
- **release:** 1.1.0-development.39 [skip ci] ([0a2ce57](https://github.com/QQuik/quik_proximity_marketing/commit/0a2ce57e667cc02bb61a92e70b67016cba75e92a))
- **release:** 1.1.0-development.4 [skip ci] ([bc70fa8](https://github.com/QQuik/quik_proximity_marketing/commit/bc70fa8354145c3c4f77e567d801588b3e3b6243))
- **release:** 1.1.0-development.40 [skip ci] ([2074b20](https://github.com/QQuik/quik_proximity_marketing/commit/2074b202dc787a15629482860f5953fc4d7a7c53))
- **release:** 1.1.0-development.41 [skip ci] ([5aa6a14](https://github.com/QQuik/quik_proximity_marketing/commit/5aa6a149e7ff830a5d6525195080a95af9e11c12))
- **release:** 1.1.0-development.42 [skip ci] ([33344ca](https://github.com/QQuik/quik_proximity_marketing/commit/33344ca70f5b2b88658a5968d6e0632153f67aa2))
- **release:** 1.1.0-development.43 [skip ci] ([fe4c881](https://github.com/QQuik/quik_proximity_marketing/commit/fe4c881059f7f300a60fd1d90269b022034021d2))
- **release:** 1.1.0-development.44 [skip ci] ([559e2bc](https://github.com/QQuik/quik_proximity_marketing/commit/559e2bc2b98bcb2cdbdd782e44e95728e73c2d75))
- **release:** 1.1.0-development.45 [skip ci] ([3db5a94](https://github.com/QQuik/quik_proximity_marketing/commit/3db5a94d587ce5d48f42b39f5311c27d14ce4be6))
- **release:** 1.1.0-development.46 [skip ci] ([114ea84](https://github.com/QQuik/quik_proximity_marketing/commit/114ea84ee1107dc075c0a2373039eb8b039704db))
- **release:** 1.1.0-development.47 [skip ci] ([d40ae1a](https://github.com/QQuik/quik_proximity_marketing/commit/d40ae1ad1b8b765e2f4dc0035f88172de748d991))
- **release:** 1.1.0-development.48 [skip ci] ([1285efd](https://github.com/QQuik/quik_proximity_marketing/commit/1285efd50cccae99f8048e88715dc12da14836f7))
- **release:** 1.1.0-development.49 [skip ci] ([32ab711](https://github.com/QQuik/quik_proximity_marketing/commit/32ab7113cb7ae46036180cc597ac65827552fe82))
- **release:** 1.1.0-development.5 [skip ci] ([597b7fb](https://github.com/QQuik/quik_proximity_marketing/commit/597b7fbb6bc30db042c47050eec67ab8203080d0))
- **release:** 1.1.0-development.50 [skip ci] ([22f3577](https://github.com/QQuik/quik_proximity_marketing/commit/22f3577f8e1b0fada483e0e68caf983dd0a33d5d))
- **release:** 1.1.0-development.51 [skip ci] ([567edcf](https://github.com/QQuik/quik_proximity_marketing/commit/567edcfb0dfb01b033bd0efe2dc5cf382ebd8c0e))
- **release:** 1.1.0-development.52 [skip ci] ([34b0760](https://github.com/QQuik/quik_proximity_marketing/commit/34b0760333d92f909beeffbadc679403f220b6be))
- **release:** 1.1.0-development.53 [skip ci] ([8e9cfd7](https://github.com/QQuik/quik_proximity_marketing/commit/8e9cfd7be36d5bb17c6178f0e469d7f32be1060b))
- **release:** 1.1.0-development.54 [skip ci] ([d74b6ce](https://github.com/QQuik/quik_proximity_marketing/commit/d74b6ceea1373d044942fbebe789b53fc248bf1e))
- **release:** 1.1.0-development.55 [skip ci] ([2cd7951](https://github.com/QQuik/quik_proximity_marketing/commit/2cd7951abd7a07673de2e56a67e6f2b957a9ecda))
- **release:** 1.1.0-development.56 [skip ci] ([825be56](https://github.com/QQuik/quik_proximity_marketing/commit/825be56c144bb01bce135b9e96165369e369fa09))
- **release:** 1.1.0-development.57 [skip ci] ([43e9f7b](https://github.com/QQuik/quik_proximity_marketing/commit/43e9f7bea5b06b335961fa5cf7a393e73b310092))
- **release:** 1.1.0-development.58 [skip ci] ([26c1a4f](https://github.com/QQuik/quik_proximity_marketing/commit/26c1a4fa48968de30b4ba4f8f7317fa732d4eed4))
- **release:** 1.1.0-development.59 [skip ci] ([fdfff14](https://github.com/QQuik/quik_proximity_marketing/commit/fdfff14c5aec5646f85dfff0794ad02f39a2df86))
- **release:** 1.1.0-development.6 [skip ci] ([c705a14](https://github.com/QQuik/quik_proximity_marketing/commit/c705a147558579ff61b2081650acda959f8aec4f))
- **release:** 1.1.0-development.60 [skip ci] ([71b42aa](https://github.com/QQuik/quik_proximity_marketing/commit/71b42aad2bb356bb8879c2fe3ff89f85709f7964))
- **release:** 1.1.0-development.61 [skip ci] ([2a41805](https://github.com/QQuik/quik_proximity_marketing/commit/2a41805cff4d775cdf786de4cef4e92c40a76417))
- **release:** 1.1.0-development.62 [skip ci] ([74fae1f](https://github.com/QQuik/quik_proximity_marketing/commit/74fae1ffb2d8440395893c9fa5c46419872dd4f7))
- **release:** 1.1.0-development.63 [skip ci] ([3e78b07](https://github.com/QQuik/quik_proximity_marketing/commit/3e78b07e40b93b3a5584a63a1ffa65ab76009f33))
- **release:** 1.1.0-development.64 [skip ci] ([d6e7b7c](https://github.com/QQuik/quik_proximity_marketing/commit/d6e7b7c01df21102d334f1d0a85058bb31d43c55))
- **release:** 1.1.0-development.65 [skip ci] ([c10571f](https://github.com/QQuik/quik_proximity_marketing/commit/c10571f601ff7c69bd5f07bd53fa40dc701ad9db))
- **release:** 1.1.0-development.66 [skip ci] ([dd1760c](https://github.com/QQuik/quik_proximity_marketing/commit/dd1760c650946345dc9d9c3364436156d471f3a6))
- **release:** 1.1.0-development.67 [skip ci] ([a42853b](https://github.com/QQuik/quik_proximity_marketing/commit/a42853b6ff480e46b1f39e19531a0ab1a0a43cce))
- **release:** 1.1.0-development.68 [skip ci] ([e41bb6a](https://github.com/QQuik/quik_proximity_marketing/commit/e41bb6aeea273fe0991c9b72887d2eac3b0f4fc4))
- **release:** 1.1.0-development.69 [skip ci] ([b6f8152](https://github.com/QQuik/quik_proximity_marketing/commit/b6f8152ec6a2b901e6082959ade8f9f51cf2d210))
- **release:** 1.1.0-development.7 [skip ci] ([8568c4a](https://github.com/QQuik/quik_proximity_marketing/commit/8568c4a721b8433ce6280f99625fe3804f63ad26))
- **release:** 1.1.0-development.70 [skip ci] ([f3b7854](https://github.com/QQuik/quik_proximity_marketing/commit/f3b7854d68caf197b5404cfec6e2719fea979867))
- **release:** 1.1.0-development.71 [skip ci] ([3bb9d92](https://github.com/QQuik/quik_proximity_marketing/commit/3bb9d920ce6cc9feb1d5b8c3b5a9455d651d67f1))
- **release:** 1.1.0-development.72 [skip ci] ([a97d954](https://github.com/QQuik/quik_proximity_marketing/commit/a97d954d999b9dcf796a0bf8cc3bfcdee4cc2f17))
- **release:** 1.1.0-development.73 [skip ci] ([497b614](https://github.com/QQuik/quik_proximity_marketing/commit/497b61444cc538dce36f868918b09e6f8fefaba9))
- **release:** 1.1.0-development.74 [skip ci] ([21ec7c8](https://github.com/QQuik/quik_proximity_marketing/commit/21ec7c8248f4fe2456ab72a0f1ffd2cf4b5e2677))
- **release:** 1.1.0-development.75 [skip ci] ([6f16624](https://github.com/QQuik/quik_proximity_marketing/commit/6f16624960d354ede51cd26c8a54612391ee4c42))
- **release:** 1.1.0-development.76 [skip ci] ([2d121e7](https://github.com/QQuik/quik_proximity_marketing/commit/2d121e736e934b5a88de9e761b886e723a9ab367))
- **release:** 1.1.0-development.77 [skip ci] ([bc41e38](https://github.com/QQuik/quik_proximity_marketing/commit/bc41e38e3d07c3f9a95c70b04334e26f101b3454))
- **release:** 1.1.0-development.78 [skip ci] ([7da0baf](https://github.com/QQuik/quik_proximity_marketing/commit/7da0baf12d226ef16ccbf6173e0d9d3f266133a6))
- **release:** 1.1.0-development.79 [skip ci] ([8a85855](https://github.com/QQuik/quik_proximity_marketing/commit/8a858555ddfa892cb8aa3f4dd5a507e936cc9c2e))
- **release:** 1.1.0-development.8 [skip ci] ([e8181be](https://github.com/QQuik/quik_proximity_marketing/commit/e8181beae4e6089335fed26e05fa61eefa8008ef))
- **release:** 1.1.0-development.80 [skip ci] ([76f2cd7](https://github.com/QQuik/quik_proximity_marketing/commit/76f2cd797c3e75e0a9afe6b947d455d53925f930))
- **release:** 1.1.0-development.81 [skip ci] ([b155265](https://github.com/QQuik/quik_proximity_marketing/commit/b1552653b174cd11c55ce0850e666815b21f402c))
- **release:** 1.1.0-development.82 [skip ci] ([f228566](https://github.com/QQuik/quik_proximity_marketing/commit/f228566a39860cae8382d55a9eaf2eb0e72e30b0))
- **release:** 1.1.0-development.83 [skip ci] ([20b87d0](https://github.com/QQuik/quik_proximity_marketing/commit/20b87d06c7c1982caea15a8d30aa505d5e2ac033))
- **release:** 1.1.0-development.84 [skip ci] ([dc9541a](https://github.com/QQuik/quik_proximity_marketing/commit/dc9541af08815289a16cdef9d33c03419d67f6cb))
- **release:** 1.1.0-development.85 [skip ci] ([46cfb1f](https://github.com/QQuik/quik_proximity_marketing/commit/46cfb1f0ad9942fa1565eae7d1b0e114f02febab))
- **release:** 1.1.0-development.86 [skip ci] ([d562d89](https://github.com/QQuik/quik_proximity_marketing/commit/d562d89994b9addf10125269a3e7640d64202277))
- **release:** 1.1.0-development.87 [skip ci] ([66f9c50](https://github.com/QQuik/quik_proximity_marketing/commit/66f9c509a62cfedebcca99fe18c6138be4821d37))
- **release:** 1.1.0-development.88 [skip ci] ([c79d056](https://github.com/QQuik/quik_proximity_marketing/commit/c79d056071d2f00b51039ae298c490873b64edba))
- **release:** 1.1.0-development.89 [skip ci] ([79b776e](https://github.com/QQuik/quik_proximity_marketing/commit/79b776ee32cee93992a89f7f5e7d8edf260aa02f))
- **release:** 1.1.0-development.9 [skip ci] ([ef57798](https://github.com/QQuik/quik_proximity_marketing/commit/ef57798d272e969223fab870a7db99ee8660630c))
- remove debug logging statements from touchpoint migration ([c0a815e](https://github.com/QQuik/quik_proximity_marketing/commit/c0a815e2fe29e5f2248d123aaf98e88ad36be97c))
- remove sentry to show source map ([607bdbd](https://github.com/QQuik/quik_proximity_marketing/commit/607bdbd3d3a1204e87c48960ab5d4561db52d45f))
- remove sourcemap ([dc34fb9](https://github.com/QQuik/quik_proximity_marketing/commit/dc34fb9df7486b2143f30f17ad4c1e9290e6933c))
- replace FZ Poppins with BeVietnamPro font family and update button styles ([e6174c2](https://github.com/QQuik/quik_proximity_marketing/commit/e6174c2f1c0b4d320e5114f3b55e17131415ace4))
- restructure some file/folder ([#357](https://github.com/QQuik/quik_proximity_marketing/issues/357)) ([348ef07](https://github.com/QQuik/quik_proximity_marketing/commit/348ef07e6c98ee788953a0834d652798123c1a9d))
- temporarily disable CombinedFilter and CurrentFilters components in analytics view ([b7bc9f1](https://github.com/QQuik/quik_proximity_marketing/commit/b7bc9f1b8ad14cae873428f5fd676676d4716230))
- update cicd ([b89a6df](https://github.com/QQuik/quik_proximity_marketing/commit/b89a6df6597916cb5f6b4919aa693060b6974ee9))
- update dev env encoded ([e9096c3](https://github.com/QQuik/quik_proximity_marketing/commit/e9096c33ff3fb8d7ac1d709ffb7c57b3747fa84e))
- update encrypted development environment variables ([f5d9e1f](https://github.com/QQuik/quik_proximity_marketing/commit/f5d9e1f9e59f78ece240fb21bee1a3b11a7cac27))
- update encrypted development environment variables ([80d5457](https://github.com/QQuik/quik_proximity_marketing/commit/80d545799196e3f2e1d159e3baaeded115d125d1))
- update env ([89266f6](https://github.com/QQuik/quik_proximity_marketing/commit/89266f669be74fa640ff3146d9849b156e118f59))
- update error message and remove endOfLine config in prettier ([f6cd34a](https://github.com/QQuik/quik_proximity_marketing/commit/f6cd34a5af907faa5545ddb56ef1e2328c321b57))
- update lockable section groupcss name ([4a6d86c](https://github.com/QQuik/quik_proximity_marketing/commit/4a6d86c2ba6b6b310efc9fc344e03b1546bbd9c3))
- update minor detail ([#384](https://github.com/QQuik/quik_proximity_marketing/issues/384)) ([82a9646](https://github.com/QQuik/quik_proximity_marketing/commit/82a96469ba662990510632e32725231eaab3bc58))
- update prettier ([eda7999](https://github.com/QQuik/quik_proximity_marketing/commit/eda7999709c526540326ddf5d65b6c1e5e1fbfc3))
- update readme for project structure ([98d2f57](https://github.com/QQuik/quik_proximity_marketing/commit/98d2f5701dbf583895a8a101869838c30b84bf09))
- update releaserc json ([92568df](https://github.com/QQuik/quik_proximity_marketing/commit/92568df4f866a9da9701cda7c727eeed975cd621))
- update translation and return text ([#385](https://github.com/QQuik/quik_proximity_marketing/issues/385)) ([31b0f04](https://github.com/QQuik/quik_proximity_marketing/commit/31b0f0478988c14ccf8a8a3f656707791081fbef))
- update translation files ([#374](https://github.com/QQuik/quik_proximity_marketing/issues/374)) ([03a2d9b](https://github.com/QQuik/quik_proximity_marketing/commit/03a2d9b11c7b8e1af12d15a7543b003a4c42b996))
- update translation for UX ([#383](https://github.com/QQuik/quik_proximity_marketing/issues/383)) ([73523f8](https://github.com/QQuik/quik_proximity_marketing/commit/73523f82cf6e2a708436c7ad812648211bdeced5))
- update UI bugs ([#446](https://github.com/QQuik/quik_proximity_marketing/issues/446)) ([635d141](https://github.com/QQuik/quik_proximity_marketing/commit/635d141195b9fc450b6c7bfad33a44f1aa312b61))
- update using hook usedayjs topperformance tp text ([#377](https://github.com/QQuik/quik_proximity_marketing/issues/377)) ([91fce81](https://github.com/QQuik/quik_proximity_marketing/commit/91fce81eab6543a983e6a5ea5cc00dcdaaa97274))
- update width select column query key qr list ([#450](https://github.com/QQuik/quik_proximity_marketing/issues/450)) ([38c94b0](https://github.com/QQuik/quik_proximity_marketing/commit/38c94b0ad2bb85292c633783ae57a9f855b7756c))
- use dayjs shared lib ([#378](https://github.com/QQuik/quik_proximity_marketing/issues/378)) ([348a284](https://github.com/QQuik/quik_proximity_marketing/commit/348a28466893b0553034fd08bb42c70f5807b8da))

### 🎨 Code Style

- add skeleton for smooth ([f3184b0](https://github.com/QQuik/quik_proximity_marketing/commit/f3184b05e51d9d372a14d3b21f4c7ad9965d77a9))
- adding style inherit to override default style of sonner ([#345](https://github.com/QQuik/quik_proximity_marketing/issues/345)) ([309912d](https://github.com/QQuik/quik_proximity_marketing/commit/309912dc50d1d63aba35dd2550e691651dd60f6b))
- fix border & try to fix qr download ([184cd56](https://github.com/QQuik/quik_proximity_marketing/commit/184cd560bb819abfd2d64c49a2352d6a1d799f7c))
- fix chart pie in analytic page ([14b7599](https://github.com/QQuik/quik_proximity_marketing/commit/14b7599bd11b5aff591662b2a1add2f0263d6cea))
- fix color chart ([10df64e](https://github.com/QQuik/quik_proximity_marketing/commit/10df64e5e4643ea8f85b2498133d99d4d653a230))
- fix color for toast description on darktheme ([dcaf507](https://github.com/QQuik/quik_proximity_marketing/commit/dcaf5078efbf8e4df1015d12fe2c1b14cf3d1b4a))
- make advanced analytic's last 2 tabs not clickable ([f9e2cdb](https://github.com/QQuik/quik_proximity_marketing/commit/f9e2cdb00d0120a4a583e106d27e9911ad90a7d0))
- remove deployment dependency from semantic release job ([e09766f](https://github.com/QQuik/quik_proximity_marketing/commit/e09766feb9750e244eb73e1193d5846c03542257))
- update chart color ([24f50f6](https://github.com/QQuik/quik_proximity_marketing/commit/24f50f62f5ed0499781b1b9b2b226fa3c6330f59))
- update QR code styling with square dots and corners, adjust UI spacing ([05c3b63](https://github.com/QQuik/quik_proximity_marketing/commit/05c3b637cfe4224c77e85691313e0a7859180471))
- update secondary color to purple in dark theme ([63a465a](https://github.com/QQuik/quik_proximity_marketing/commit/63a465af42026f4e02540d1420a81ccfa67d0cf1))
- update style for not misunderstanding ([4587567](https://github.com/QQuik/quik_proximity_marketing/commit/45875674ddfb80ba28b7b572a87f8229af97895b))
- update UI components with consistent sizing and improved visual design ([6655908](https://github.com/QQuik/quik_proximity_marketing/commit/6655908bc816baceed55814406d52334ebcfe983))

### 🚀 Performance Improvements

- implement code splitting and optimize package imports for better performance ([#431](https://github.com/QQuik/quik_proximity_marketing/issues/431)) ([f5426b4](https://github.com/QQuik/quik_proximity_marketing/commit/f5426b4b589d8c110e671d2f183f4d3ee1e60e9f))

## [1.1.0](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.1...v1.1.0) (2025-09-29)

### ✨ Features

- add 3 links per day limit and auto-delete after 7 days for anonymous touch points ([4b2fade](https://github.com/QQuik/quik_proximity_marketing/commit/4b2fade6b2617f9048c2c287d9e0da8e9bbf3032))
- add advanced analytic with mockup data ([#351](https://github.com/QQuik/quik_proximity_marketing/issues/351)) ([01ea0ec](https://github.com/QQuik/quik_proximity_marketing/commit/01ea0ececcb250ee0a0cf4a48cc0837b573d439e))
- add ai generate slug components ([8e09ba4](https://github.com/QQuik/quik_proximity_marketing/commit/8e09ba41141039e494f4c2a3a42f6a5678e656c9))
- add behavior tabs with api ([#365](https://github.com/QQuik/quik_proximity_marketing/issues/365)) ([93600ec](https://github.com/QQuik/quik_proximity_marketing/commit/93600ec7fb90c0ea76834ce6796223ad648ecf9c))
- add behavior tabs with mockdata [#364](https://github.com/QQuik/quik_proximity_marketing/issues/364) ([caaf378](https://github.com/QQuik/quik_proximity_marketing/commit/caaf378e40672365d57c71bc76fd2a33beae35bb))
- add bootstrap client ([#388](https://github.com/QQuik/quik_proximity_marketing/issues/388)) ([3e247fc](https://github.com/QQuik/quik_proximity_marketing/commit/3e247fc1a84a37db163e39b1bdca728ad0b11fa5))
- add domain-based cookie handling for cross-subdomain authentication ([38550b0](https://github.com/QQuik/quik_proximity_marketing/commit/38550b004d0d947a6d06824b0edb75a73ab43fc6))
- add download button for QR code in migrated anonymous dialog ([cd884bb](https://github.com/QQuik/quik_proximity_marketing/commit/cd884bb08e84e7c17b4eaddbe492c2b867aeead3))
- add expiration dates and SameSite policy to auth cookies ([92421db](https://github.com/QQuik/quik_proximity_marketing/commit/92421dbc392fd0b624ff4d8bff8a3660b4d48534))
- add form dirty state tracking and reset functionality for QR customization ([ed893e4](https://github.com/QQuik/quik_proximity_marketing/commit/ed893e4c9f275e291118e46e290a4b637a237cda))
- add host to allowed CORS headers in middleware ([09e8d1b](https://github.com/QQuik/quik_proximity_marketing/commit/09e8d1b90718c59043db6c141cf4a196f0d292c8))
- add i18n support for error messages in react-query error handler ([67e1bc5](https://github.com/QQuik/quik_proximity_marketing/commit/67e1bc515a996a02ea4fbe593fda7bfaec7d9bb5))
- add i18n support for error messages with default fallbacks ([5249af9](https://github.com/QQuik/quik_proximity_marketing/commit/5249af9c180276f8d68620add84ce8c856db9576))
- add lazy load into advanced analytic overview page ([26ee8ba](https://github.com/QQuik/quik_proximity_marketing/commit/26ee8ba48b3dc42c6b04a36f1ec9cd12ea539956))
- add locale support for AI-generated slugs and improve error handling ([#410](https://github.com/QQuik/quik_proximity_marketing/issues/410)) ([bf592b0](https://github.com/QQuik/quik_proximity_marketing/commit/bf592b0cc95361adc81248d8564f12c2eea0d5ca))
- add localized format plugin and simplify anon touch points response structure ([a2a9107](https://github.com/QQuik/quik_proximity_marketing/commit/a2a9107ca1301efc84e2191bf48375b5c2bef97d))
- add maxLength validation to tag inputs with 32 character limit ([f8d031f](https://github.com/QQuik/quik_proximity_marketing/commit/f8d031fe0a2d4f78708d55baf5dcea39736e57a0))
- add name validation to touch point update schema with min/max length ([83869e9](https://github.com/QQuik/quik_proximity_marketing/commit/83869e95b93766ef88244466c7127a4a9be4ccf2))
- add openobserve browser rum ([7d9a2fd](https://github.com/QQuik/quik_proximity_marketing/commit/7d9a2fd61161ad08e43801bd5c3798ff773999a8))
- add OPTIONS handler with CORS support for touch-point endpoints ([5e23d38](https://github.com/QQuik/quik_proximity_marketing/commit/5e23d3801e5c9a73f5dff64d4aa1b389bcf6bad7))
- add QR logo image upload and customize options for touch points ([3f176fd](https://github.com/QQuik/quik_proximity_marketing/commit/3f176fda1ff5f758b74958f6db21c3235a7867e4))
- add real api into advanced analytic ([#359](https://github.com/QQuik/quik_proximity_marketing/issues/359)) ([1324db1](https://github.com/QQuik/quik_proximity_marketing/commit/1324db175155458d5318b07fe829226ae49fac11))
- add service-to-service authentication with API key validation ([#432](https://github.com/QQuik/quik_proximity_marketing/issues/432)) ([29ec851](https://github.com/QQuik/quik_proximity_marketing/commit/29ec8518c555bad37af77bdde2f86e1362268199))
- add timezone ([#348](https://github.com/QQuik/quik_proximity_marketing/issues/348)) ([b2112f3](https://github.com/QQuik/quik_proximity_marketing/commit/b2112f3ae964103e98d3eccece0eb1d3a6746328))
- add token refresh handling and QR code URL tracking parameter ([4b3148d](https://github.com/QQuik/quik_proximity_marketing/commit/4b3148d4a2709d50bd0aa5a29e604eee0343d223))
- create qr svg when user create tp ([199eb61](https://github.com/QQuik/quik_proximity_marketing/commit/199eb617138f3a6cd564c9b87cd589dec7efc0bf))
- enhance CreateDomainForm and API response structure with improved error handling and new types ([b8e13a5](https://github.com/QQuik/quik_proximity_marketing/commit/b8e13a51f836fcf7f34dea0c9dfdfb190ebe0d9b))
- enhance error handling in touch point creation with rollback and localized messages ([ab889ac](https://github.com/QQuik/quik_proximity_marketing/commit/ab889ac9a397392327991997d2cfb7ebae04e314))
- implement activity line chart with daily trend visualization and analytics ([#360](https://github.com/QQuik/quik_proximity_marketing/issues/360)) ([7535f4c](https://github.com/QQuik/quik_proximity_marketing/commit/7535f4c239b457ebe925859393bbe50ab303ae93))
- implement advanced analytics filtering with tags and touchpoints selection ([3cd7105](https://github.com/QQuik/quik_proximity_marketing/commit/3cd7105411a5bd0acaf6c9738376239bbadadbe8))
- implement advanced filter UI with tag and touchpoint selection ([128412d](https://github.com/QQuik/quik_proximity_marketing/commit/128412ddfca1a2187a477b3ea9678e54efaa8ec3))
- implement AI provider key rotation and caching system for slug generation ([4fbb948](https://github.com/QQuik/quik_proximity_marketing/commit/4fbb948a86fb2a369e7c661ce3f98cb42938253a))
- implement AI-powered slug generation with LiteLLM and Firecrawler integration ([cfd6035](https://github.com/QQuik/quik_proximity_marketing/commit/cfd603557c501316c54509a00b21b7868c744712))
- implement anon migration with pending touch points and user profile API ([#422](https://github.com/QQuik/quik_proximity_marketing/issues/422)) ([bd22dd9](https://github.com/QQuik/quik_proximity_marketing/commit/bd22dd9698ec67a76084dce2508b8fcd595cc143))
- implement anonymous touch points API with middleware and schema validation ([85f0217](https://github.com/QQuik/quik_proximity_marketing/commit/85f0217dd263a00bab558470ac1fb222afaf833c))
- implement anonymous touch points API with repository and service layers ([6bbb254](https://github.com/QQuik/quik_proximity_marketing/commit/6bbb254cd592e86959f8aad808dd5002e3f14624))
- implement auth refresh and logout endpoints with cookie management ([2947847](https://github.com/QQuik/quik_proximity_marketing/commit/294784782360d28fb4a7ca14c6f3c01bfeda7a58))
- implement CORS middleware with domain allowlist for public API endpoints ([55da9f6](https://github.com/QQuik/quik_proximity_marketing/commit/55da9f66e4aba8f56b3f216acb91f91e614217cf))
- implement i18n on api & zod ([#380](https://github.com/QQuik/quik_proximity_marketing/issues/380)) ([c6a47e8](https://github.com/QQuik/quik_proximity_marketing/commit/c6a47e8debc39c3ffb550c880063ae175af71d69))
- implement locale and timezone management with dayjs integration ([5843c0f](https://github.com/QQuik/quik_proximity_marketing/commit/5843c0f4b7c220b81b0e5ea78c42b856dbde8541))
- implement server-side timezone and locale handling with dayjs integration ([35841cf](https://github.com/QQuik/quik_proximity_marketing/commit/35841cff7947172880f83327032f2ee49fb34eb5))
- implement timezone handling across analytics and dashboard components ([e58fbbd](https://github.com/QQuik/quik_proximity_marketing/commit/e58fbbdaa587ab4d63ea06f3f7eb209739ac0593))
- limit active time range display to 3 hours in channel analysis ([05ff693](https://github.com/QQuik/quik_proximity_marketing/commit/05ff6935e69fad2313a72d067228396442fed061))
- limit anonymous users to 1 total touch point instead of 3 per day ([96ed895](https://github.com/QQuik/quik_proximity_marketing/commit/96ed895a73287a5db752c54d794cb8e89cca9afa))
- modify code & add hook & api for advanced analytics ([#355](https://github.com/QQuik/quik_proximity_marketing/issues/355)) ([e3f639c](https://github.com/QQuik/quik_proximity_marketing/commit/e3f639c36a90ac0d406cc45acc92fb6c29b35915))
- move custom domains to dedicated page and improve filter UI ([43aa0a3](https://github.com/QQuik/quik_proximity_marketing/commit/43aa0a317879bfb688e9744c37870959a482032a))
- realtime data tab ([#373](https://github.com/QQuik/quik_proximity_marketing/issues/373)) ([3f8d16f](https://github.com/QQuik/quik_proximity_marketing/commit/3f8d16fc680f6d4adc6122732af35413be89f77a))
- update ui version 1.0 for acquistions and hide the attribute override… ([#358](https://github.com/QQuik/quik_proximity_marketing/issues/358)) ([dc0ab5a](https://github.com/QQuik/quik_proximity_marketing/commit/dc0ab5aa43dd2ab483d99c9ffb3515988b02687a))

### 🐛 Bug Fixes

- 404 button ([#336](https://github.com/QQuik/quik_proximity_marketing/issues/336)) ([2989283](https://github.com/QQuik/quik_proximity_marketing/commit/29892831200c0bde453edf30d78edd03f66a96e3))
- add ts-ignore to suppress type error in QR color options update ([4aeaf58](https://github.com/QQuik/quik_proximity_marketing/commit/4aeaf586840a9bb74a95f81847daa0caceb6811e))
- adding type button to ai optimize btn ([#407](https://github.com/QQuik/quik_proximity_marketing/issues/407)) ([8ee1ab7](https://github.com/QQuik/quik_proximity_marketing/commit/8ee1ab72cb4993aac9beea0bef4ee19a9ff8588a))
- analytic advanced & some error ([baba42b](https://github.com/QQuik/quik_proximity_marketing/commit/baba42b1600f6dc2c05897808875df8aafbde1fd))
- build error by correct null check ([#369](https://github.com/QQuik/quik_proximity_marketing/issues/369)) ([5014422](https://github.com/QQuik/quik_proximity_marketing/commit/5014422e1d9f00fa06b99f3b4a4686a13897249e))
- change env & fix api for tags ([be08057](https://github.com/QQuik/quik_proximity_marketing/commit/be08057682be4fff39f21fde529d5d8fefcf64c9))
- copy qr on svg type ([1c25899](https://github.com/QQuik/quik_proximity_marketing/commit/1c25899e29bee1f9965cd3f3baa4925213324dab))
- create tp form ([71f12f1](https://github.com/QQuik/quik_proximity_marketing/commit/71f12f1d6553829754c6adccab186927ca87d2bb))
- dashboard crash by data undifined ([08c3110](https://github.com/QQuik/quik_proximity_marketing/commit/08c31101564785ae7385df4acfd0ed6b54a0afab))
- dockerfile for node-canvas ([c59ca22](https://github.com/QQuik/quik_proximity_marketing/commit/c59ca228a4fbb7a1f7ff830c7af2267fdb923c3e))
- domain not have https ([e6e973e](https://github.com/QQuik/quik_proximity_marketing/commit/e6e973e29ff3a757830a3ec5062a0c9c22626dc1))
- empty response message ([1c21bc8](https://github.com/QQuik/quik_proximity_marketing/commit/1c21bc8962c0b57adcebb8d04ddb8305dd2efbfe))
- ensure cookies are always deleted regardless of domain during logout ([1559620](https://github.com/QQuik/quik_proximity_marketing/commit/155962076fdefeb87a60cc0a645163570aeab831))
- env de ([6f365ca](https://github.com/QQuik/quik_proximity_marketing/commit/6f365caebb0b7d80dec84ff0289e8a3da0cc22bf))
- env local ([dc6c5c8](https://github.com/QQuik/quik_proximity_marketing/commit/dc6c5c864ae2d1eb4f9ae0dfe79bddc7f652d779))
- error on tree select ([9c2c974](https://github.com/QQuik/quik_proximity_marketing/commit/9c2c9748cdc00533f2e9f9957e5dbe6514466a5b))
- error when null data ([#371](https://github.com/QQuik/quik_proximity_marketing/issues/371)) ([8a3e97d](https://github.com/QQuik/quik_proximity_marketing/commit/8a3e97d1e7f5b3ce908c742abf9d70bc698ac91b))
- fix cicd & releaserc ([2882c87](https://github.com/QQuik/quik_proximity_marketing/commit/2882c87342b4c7bf3ae0ca19427ea0dc8322006e))
- fix error when null data fetching ([#370](https://github.com/QQuik/quik_proximity_marketing/issues/370)) ([2ef0f8b](https://github.com/QQuik/quik_proximity_marketing/commit/2ef0f8b66716fa8c7f911780db66840861f0b35e))
- handle cookie domain for production environment in auth routes ([f7b1aaa](https://github.com/QQuik/quik_proximity_marketing/commit/f7b1aaa85a7cb57960395a290679b5ae6fee6aed))
- handle null createdTpId in rollback and improve type safety ([2c15143](https://github.com/QQuik/quik_proximity_marketing/commit/2c15143a3c35927f816fead761db75105c7bab92))
- heatmap hover ([f1cbdb2](https://github.com/QQuik/quik_proximity_marketing/commit/f1cbdb2c1ed163037731d9071f623c2ac3bb661a))
- heatmap wrong color ([59840c7](https://github.com/QQuik/quik_proximity_marketing/commit/59840c718f788f354f21562f2548f27e20f3d655))
- hide performance overview + back btn in tp detail ([63ec355](https://github.com/QQuik/quik_proximity_marketing/commit/63ec355645f08c5c19456fffd33c61fcdc818750))
- hot fix table rows ([ddc4500](https://github.com/QQuik/quik_proximity_marketing/commit/ddc4500a799a68adc5f592202d4fda06fa55c085))
- include 403 status in token refresh interceptor logic ([db1f155](https://github.com/QQuik/quik_proximity_marketing/commit/db1f1558323eaed7f92d899fd21600afd2da5892))
- mapping country not work ([88ed73f](https://github.com/QQuik/quik_proximity_marketing/commit/88ed73ff9e2ae6659bc1ff28f85cdb5711fb1ac4))
- metatag error ([7dbb596](https://github.com/QQuik/quik_proximity_marketing/commit/7dbb596a1fbfb6469d588e5b8af1424b1a7713ac))
- plan check for create tp anon ([a5c37f0](https://github.com/QQuik/quik_proximity_marketing/commit/a5c37f005da0198b43ebb7184fd0df703994f605))
- profile service ([#390](https://github.com/QQuik/quik_proximity_marketing/issues/390)) ([8c4bcba](https://github.com/QQuik/quik_proximity_marketing/commit/8c4bcba273ea35c8c966696b70efc57d52327520))
- qr spam update in tp update page ([326d38a](https://github.com/QQuik/quik_proximity_marketing/commit/326d38ae54b9534664e9e554bbec824317581fe6))
- qr-customize-in-app-load-wrong-options by remove hard code color ([#417](https://github.com/QQuik/quik_proximity_marketing/issues/417)) ([4f1c5a5](https://github.com/QQuik/quik_proximity_marketing/commit/4f1c5a58f305e4878ea8f8b3b653e0e32fd76e6b))
- querykey tag detail ([#457](https://github.com/QQuik/quik_proximity_marketing/issues/457)) ([3478fd2](https://github.com/QQuik/quik_proximity_marketing/commit/3478fd23ab77b5c7c832c69c67c0c7b6122ca3a5))
- reduce use effect qr render ([#427](https://github.com/QQuik/quik_proximity_marketing/issues/427)) ([ad7d397](https://github.com/QQuik/quik_proximity_marketing/commit/ad7d3976ddbb70d99fad6b345bdf2a7274b23e5c))
- refresh token error ([4284e2c](https://github.com/QQuik/quik_proximity_marketing/commit/4284e2ce41da3965a80ebc5fb131f7e8a39965ab))
- refresh token make duplicate cookie ([a7a8b65](https://github.com/QQuik/quik_proximity_marketing/commit/a7a8b653cbe06bd1c33f5c958ccb6be4417055a9))
- remove eval for security ([#464](https://github.com/QQuik/quik_proximity_marketing/issues/464)) ([d450cd9](https://github.com/QQuik/quik_proximity_marketing/commit/d450cd91385600dc31e1e523c55a741b4a6a0153))
- remove react context ([9748616](https://github.com/QQuik/quik_proximity_marketing/commit/9748616ea8956b1bee29ca89cbda6cfc5207ca17))
- show full QR customization form when QR code is dirty ([61ffd42](https://github.com/QQuik/quik_proximity_marketing/commit/61ffd42b26fcab5c6e9c79adf5759a88180c6d97))
- skip domain-based cookie deletion in development environment ([9ade6e7](https://github.com/QQuik/quik_proximity_marketing/commit/9ade6e78debe184cd070c712cccdb4ce7db7287b))
- suspense on acquisitions tab ([62df083](https://github.com/QQuik/quik_proximity_marketing/commit/62df08367024bc69cefd1d94304753afd30a6a35))
- tag errors ([603b7e5](https://github.com/QQuik/quik_proximity_marketing/commit/603b7e5ecd3f93ef0b42a12219677c2ca92939c4))
- tags error on macos ([403fab6](https://github.com/QQuik/quik_proximity_marketing/commit/403fab61462f8b230aa7dd373b7c186ac7f9c1a5))
- ts error on blob type ([38c4a60](https://github.com/QQuik/quik_proximity_marketing/commit/38c4a60d085525a8e237330f3f9bb81ab10c05dd))
- typescript error ([abec86b](https://github.com/QQuik/quik_proximity_marketing/commit/abec86b8eb6d38108b7d92c4ed29f8de487b6d59))
- typescript error on blob type ([deea737](https://github.com/QQuik/quik_proximity_marketing/commit/deea7374861286cf4433bcf4a1f568de34ea2026))
- ui update for dashboard ([4f3498a](https://github.com/QQuik/quik_proximity_marketing/commit/4f3498a901156457b15cbd435f3fa788c1c607d0))
- update dependabot config to use npm instead of yarn package ecosystem ([62bc715](https://github.com/QQuik/quik_proximity_marketing/commit/62bc715b3f2ea7034dba21e86d9e699a8df9f7c8))
- update Docker dependencies for node-canvas and add ts-ignore comments for type safety ([a93fe19](https://github.com/QQuik/quik_proximity_marketing/commit/a93fe1926648a428f30ea644eeffe9b5cb0af986))
- update Dockerfile to properly install node-canvas dependencies in base image ([8587468](https://github.com/QQuik/quik_proximity_marketing/commit/858746885afb35fec2006d3a5befa2703d4f5fb0))
- update mail queue ([4f2b81c](https://github.com/QQuik/quik_proximity_marketing/commit/4f2b81c1c2b900fdc5a1e2fa1bc7d1304ceeeaa7))
- update SameSite cookie attribute from None to Lax for auth tokens ([09edd47](https://github.com/QQuik/quik_proximity_marketing/commit/09edd4756335045ad09096c30f7ab60d887d9ae3))
- update short_url to use environment variable for base URL ([ac0dfe2](https://github.com/QQuik/quik_proximity_marketing/commit/ac0dfe220b3825d17775ff704069d39a53202eaf))
- update to using app error and check empty in advanced analytic ([#386](https://github.com/QQuik/quik_proximity_marketing/issues/386)) ([1dcf292](https://github.com/QQuik/quik_proximity_marketing/commit/1dcf2926f35abead1f14723d2a2ad7be203d825e))
- use full domain with shortcode instead of shortUrl for QR code generation ([24c8a9f](https://github.com/QQuik/quik_proximity_marketing/commit/24c8a9fe1360df32f4a2c7d3e5b0318ee7bddd94))
- use QR customization options from created touch point instead of default options ([bd816a2](https://github.com/QQuik/quik_proximity_marketing/commit/bd816a298a75493a567a4a0004f5d55e81a6d9da))
- using session to get user in update Profile and remove console… ([#389](https://github.com/QQuik/quik_proximity_marketing/issues/389)) ([e0b20c2](https://github.com/QQuik/quik_proximity_marketing/commit/e0b20c26da9438bdf6784b21462d7f002440c502))
- workflow ([e21d618](https://github.com/QQuik/quik_proximity_marketing/commit/e21d6180a98b5a4493efb0613aadd86108cff7b0))
- wrap ArrayBuffer in Uint8Array when creating Blob/File for QR code images ([cfccb09](https://github.com/QQuik/quik_proximity_marketing/commit/cfccb09cad9767c3b30947a23a4e5cd6c552d1b5))
- wrong logic when add tp into tag ([7af645f](https://github.com/QQuik/quik_proximity_marketing/commit/7af645f1eef7bab343e0d20fe85d98bd0b32d294))

### 🛠 Updates

- add api call for acquistion ([#361](https://github.com/QQuik/quik_proximity_marketing/issues/361)) ([91adbfc](https://github.com/QQuik/quik_proximity_marketing/commit/91adbfcbad43dc55de85ea3fa35a54c2350afcea))
- add copy btn in qr result ([e9ca6b0](https://github.com/QQuik/quik_proximity_marketing/commit/e9ca6b0889fc63d4a6f5541c889d3a515e64ac65))
- adding feature export tp file ([#418](https://github.com/QQuik/quik_proximity_marketing/issues/418)) ([c8068df](https://github.com/QQuik/quik_proximity_marketing/commit/c8068df90ac147c53586b51b2e1677249b93a269))
- adding null check for some maps and remove Empty section, change it to null instead for reduce misunderstanding, apply tabs for Audience ([#366](https://github.com/QQuik/quik_proximity_marketing/issues/366)) ([cb0bf5f](https://github.com/QQuik/quik_proximity_marketing/commit/cb0bf5f84dad03fb24e7733dc1eb319817d8f162))
- adding null check for tabs ([#368](https://github.com/QQuik/quik_proximity_marketing/issues/368)) ([d894cd2](https://github.com/QQuik/quik_proximity_marketing/commit/d894cd265a3b5d1a2cb20f81e00b39ba661e9147))
- Adding placholder for empty data chart ([#372](https://github.com/QQuik/quik_proximity_marketing/issues/372)) ([9834143](https://github.com/QQuik/quik_proximity_marketing/commit/983414350dd696c641e3d5d0e4613fdb56f92f3c))
- adding zod translation ([#382](https://github.com/QQuik/quik_proximity_marketing/issues/382)) ([9d3caab](https://github.com/QQuik/quik_proximity_marketing/commit/9d3caabb43c12c82796f35a72fe9e1a58c34ccf8))
- advanced analytic UI v0.1 ([#352](https://github.com/QQuik/quik_proximity_marketing/issues/352)) ([17d935f](https://github.com/QQuik/quik_proximity_marketing/commit/17d935f214f37653c025932630ec9446222428ea))
- advanced analytic UI v0.2 ([#353](https://github.com/QQuik/quik_proximity_marketing/issues/353)) ([687c942](https://github.com/QQuik/quik_proximity_marketing/commit/687c9421088fa9a0af7393b0db2b72369a96191e))
- ai slug UI v2.1 ([#412](https://github.com/QQuik/quik_proximity_marketing/issues/412)) ([aa2b1a7](https://github.com/QQuik/quik_proximity_marketing/commit/aa2b1a7642c805088b9c6d3322035afff9a7f165))
- ai UI slug with design ([#408](https://github.com/QQuik/quik_proximity_marketing/issues/408)) ([8f4a6ff](https://github.com/QQuik/quik_proximity_marketing/commit/8f4a6ff056cb72c491f9608f4b1a89586361d55c))
- app sidebar v0.1 ([#425](https://github.com/QQuik/quik_proximity_marketing/issues/425)) ([6217700](https://github.com/QQuik/quik_proximity_marketing/commit/621770089b2af28a9018c807d01eab70e2f10094))
- arrow back and log out button ([#415](https://github.com/QQuik/quik_proximity_marketing/issues/415)) ([636b926](https://github.com/QQuik/quik_proximity_marketing/commit/636b92689e34c0c77a7321d3e281ae92a08f79f8))
- auto switch tab to qr code if generate by create qr code ([#463](https://github.com/QQuik/quik_proximity_marketing/issues/463)) ([e65bea3](https://github.com/QQuik/quik_proximity_marketing/commit/e65bea3aa8ad5e0794da64fed6dd57d0ed91d99c))
- change default options of qr to match with qr in landing page ([#413](https://github.com/QQuik/quik_proximity_marketing/issues/413)) ([519ca2b](https://github.com/QQuik/quik_proximity_marketing/commit/519ca2b885f0e6d28005a6b904fb6925ec0de7db))
- change default url ([#474](https://github.com/QQuik/quik_proximity_marketing/issues/474)) ([2cb735f](https://github.com/QQuik/quik_proximity_marketing/commit/2cb735f46f01adb61bcb02ba6fdbacf73adc52a7))
- change li2con from png to svg ([#340](https://github.com/QQuik/quik_proximity_marketing/issues/340)) ([0349e3e](https://github.com/QQuik/quik_proximity_marketing/commit/0349e3ec84dcc40e268ee74d44f7493860830c2e))
- change logic of validate desination ([dbf3e00](https://github.com/QQuik/quik_proximity_marketing/commit/dbf3e006545fcdd541718b6be4006edf7ce6e04b))
- change text top performing and rename file ([#342](https://github.com/QQuik/quik_proximity_marketing/issues/342)) ([2a01c43](https://github.com/QQuik/quik_proximity_marketing/commit/2a01c4393bc010a80170f696c3110b1abde3d774))
- code syntax ([#465](https://github.com/QQuik/quik_proximity_marketing/issues/465)) ([80ab7ad](https://github.com/QQuik/quik_proximity_marketing/commit/80ab7ad4b1c330014df668da3e66d192eecdd637))
- create tp with advance custom customize ([#454](https://github.com/QQuik/quik_proximity_marketing/issues/454)) ([f34dee4](https://github.com/QQuik/quik_proximity_marketing/commit/f34dee43ec5577e65aecd6a09b80bf13ccc3b34d))
- dashboard new UI ([#429](https://github.com/QQuik/quik_proximity_marketing/issues/429)) ([3fac90a](https://github.com/QQuik/quik_proximity_marketing/commit/3fac90a92fd1224c33cb36b41eab37afb28b79e1))
- display one month selection for mobile calendar ([#341](https://github.com/QQuik/quik_proximity_marketing/issues/341)) ([ba22f30](https://github.com/QQuik/quik_proximity_marketing/commit/ba22f30d46cc0a9f1bf4831937c3f7f2f599454c))
- filter for advanced analytic ([#393](https://github.com/QQuik/quik_proximity_marketing/issues/393)) ([7528be5](https://github.com/QQuik/quik_proximity_marketing/commit/7528be5fe9a026b1b4a51d654dff9a05f6198cc1))
- fix and create new tp v0.1 ([#453](https://github.com/QQuik/quik_proximity_marketing/issues/453)) ([54ec83f](https://github.com/QQuik/quik_proximity_marketing/commit/54ec83f19639735c3ae846574a738c0323139091))
- import file validate data ([#406](https://github.com/QQuik/quik_proximity_marketing/issues/406)) ([1eab054](https://github.com/QQuik/quik_proximity_marketing/commit/1eab0542ca295b978e16b9393453288809bc64b0))
- improve UI dashboard & save qr image when insert/update tp ([#439](https://github.com/QQuik/quik_proximity_marketing/issues/439)) ([b366ca0](https://github.com/QQuik/quik_proximity_marketing/commit/b366ca072ffbda052b868e77c1a099c6e626919d))
- list qr and shortlink ([#436](https://github.com/QQuik/quik_proximity_marketing/issues/436)) ([f9f80ba](https://github.com/QQuik/quik_proximity_marketing/commit/f9f80ba820b191c40faf8f693ba28ddefa7c0797))
- missing code from cherry pick for linechart and heatmap ([#395](https://github.com/QQuik/quik_proximity_marketing/issues/395)) ([5cf5558](https://github.com/QQuik/quik_proximity_marketing/commit/5cf5558df5569df98752367cabb768cb536ae045))
- move dev from release into pre-release ([0f7415f](https://github.com/QQuik/quik_proximity_marketing/commit/0f7415f9fb08f5ac57bdf13618776d21326c73e2))
- qr options client ([#445](https://github.com/QQuik/quik_proximity_marketing/issues/445)) ([1b5d23a](https://github.com/QQuik/quik_proximity_marketing/commit/1b5d23a8ebf9afaf8919eedfdc61a746bdeb5c1d))
- querykey for tag detail and max character display for name tp… ([#456](https://github.com/QQuik/quik_proximity_marketing/issues/456)) ([9349668](https://github.com/QQuik/quik_proximity_marketing/commit/934966816a16e3a6ad7b37c2b3d6c911451b2a3b))
- remove package next server ([#462](https://github.com/QQuik/quik_proximity_marketing/issues/462)) ([4b30473](https://github.com/QQuik/quik_proximity_marketing/commit/4b304735f8178f18e5905879ac4e4d95deef1167))
- remove unused import and add maw-width for right image in meta tags ([#337](https://github.com/QQuik/quik_proximity_marketing/issues/337)) ([a8d684c](https://github.com/QQuik/quik_proximity_marketing/commit/a8d684ce0f34865acdab03250b298702eba466fe))
- setup AI Optimize Slug UI version 1.0, still missing AI Recom… ([#396](https://github.com/QQuik/quik_proximity_marketing/issues/396)) ([a995765](https://github.com/QQuik/quik_proximity_marketing/commit/a995765bd4662ae2a762a600bfe029ecb09dfa1e))
- slug generation prompt ([#405](https://github.com/QQuik/quik_proximity_marketing/issues/405)) ([023c55b](https://github.com/QQuik/quik_proximity_marketing/commit/023c55b3f40812beda8cde054d6a71affd07ab7e))
- text remove download shortlink list ([#444](https://github.com/QQuik/quik_proximity_marketing/issues/444)) ([1a0ab8f](https://github.com/QQuik/quik_proximity_marketing/commit/1a0ab8f2755a12ff9906f7000471777a32b9cc9f))
- translation and tag badges ([#448](https://github.com/QQuik/quik_proximity_marketing/issues/448)) ([494d7f1](https://github.com/QQuik/quik_proximity_marketing/commit/494d7f1ff5dfb1054c55baed56509cc0564a948a))
- translation files ([#381](https://github.com/QQuik/quik_proximity_marketing/issues/381)) ([6c6c91b](https://github.com/QQuik/quik_proximity_marketing/commit/6c6c91b2f885358de46de17735c1dcecaf27f5ff))
- ui change padding & slug schema ([#455](https://github.com/QQuik/quik_proximity_marketing/issues/455)) ([7b9963b](https://github.com/QQuik/quik_proximity_marketing/commit/7b9963bcdee37611cb5618f6e8498d85ff7e4789))
- update skeleton for lazy load components ([dec8173](https://github.com/QQuik/quik_proximity_marketing/commit/dec817393885afe3d1628f38d9580f4ee5df8b01))
- upgrade chart version ([57eaa2d](https://github.com/QQuik/quik_proximity_marketing/commit/57eaa2d17bae3fdcca8b3b55c7c2969bd52d39c7))
- using iconLeft instead of using children ([#458](https://github.com/QQuik/quik_proximity_marketing/issues/458)) ([e18def7](https://github.com/QQuik/quik_proximity_marketing/commit/e18def7263b9f9eb88488703d82d792eb2777d8d))

### ♻️ Code Refactoring

- components into features ([#362](https://github.com/QQuik/quik_proximity_marketing/issues/362)) ([17b5798](https://github.com/QQuik/quik_proximity_marketing/commit/17b57986fac8a48228e2e226af98e8eb5252c695))
- implement CORS middleware with enhanced security and caching headers ([9ffa50f](https://github.com/QQuik/quik_proximity_marketing/commit/9ffa50f0c652e6236ccff2174e5f17d2df674b1e))
- improve error handling and type safety in premium grant callback ([f86c134](https://github.com/QQuik/quik_proximity_marketing/commit/f86c1341f7aa184b0e1ce4ca94209189c47f44b4))
- improve file upload validation and error handling for CSV imports ([#409](https://github.com/QQuik/quik_proximity_marketing/issues/409)) ([692f058](https://github.com/QQuik/quik_proximity_marketing/commit/692f05829fd2d54481053ead07ee7a0182f3cff3))
- migrate from CampaignContentType to TouchPointContentType enum ([c89f26b](https://github.com/QQuik/quik_proximity_marketing/commit/c89f26b639a1e775aa8b12cb6618d19db70c2031))
- move assets into more structural place ([#347](https://github.com/QQuik/quik_proximity_marketing/issues/347)) ([2c3fac3](https://github.com/QQuik/quik_proximity_marketing/commit/2c3fac34e6703c1268d40784eaf90c3f7d547274))
- move logic tp delete & tp create into core ([fbeb3f7](https://github.com/QQuik/quik_proximity_marketing/commit/fbeb3f79fa165687f60df9787400f0c597698e88))
- project structure ([#343](https://github.com/QQuik/quik_proximity_marketing/issues/343)) ([d4d601d](https://github.com/QQuik/quik_proximity_marketing/commit/d4d601dd5dfaafae57c3dfb4805d755ff99aaf47))
- remove loading state and spinner from QR code rendering component ([e1be078](https://github.com/QQuik/quik_proximity_marketing/commit/e1be0781ce233128097a50adb4f088a4e6c510d8))
- reorganize Dockerfile layers and enhance button component with icon positioning support ([e85b063](https://github.com/QQuik/quik_proximity_marketing/commit/e85b063cbcf2a8e63f22e64614e51ccd9068cb9f))
- repo service profile userplan ([#349](https://github.com/QQuik/quik_proximity_marketing/issues/349)) ([6b49180](https://github.com/QQuik/quik_proximity_marketing/commit/6b491805a020ca40a65d01293fed9aca0564c9e7))
- restructure codebase based features ([#363](https://github.com/QQuik/quik_proximity_marketing/issues/363)) ([849cbc0](https://github.com/QQuik/quik_proximity_marketing/commit/849cbc06703e9d633714ca519893e5bd21261dad))
- simplify touch point creation and update Redis password handling ([64544db](https://github.com/QQuik/quik_proximity_marketing/commit/64544db5beed8df67baa00a03dea7dda707ea7a3))
- touch point create api ([108549d](https://github.com/QQuik/quik_proximity_marketing/commit/108549dd01ad3ae14f88fb04085a1b703e0a05b8))
- touch point module into core ([#350](https://github.com/QQuik/quik_proximity_marketing/issues/350)) ([aaed4a0](https://github.com/QQuik/quik_proximity_marketing/commit/aaed4a01aa91ed0b4d470c1e18aca6c190835267))
- upgrade tailwind to v4 ([#473](https://github.com/QQuik/quik_proximity_marketing/issues/473)) ([6ee8dab](https://github.com/QQuik/quik_proximity_marketing/commit/6ee8dab91513df98f3708d13d11c0aaf7f10a8d0))
- use provided message as default error message instead of hardcoded strings ([e8188ac](https://github.com/QQuik/quik_proximity_marketing/commit/e8188acbfea5594734244217045099b3cce2b98e))

### Chore

- add dependabot configuration for daily yarn package updates ([c958da8](https://github.com/QQuik/quik_proximity_marketing/commit/c958da8ce0b0daae049d9de5c4b597648efd5e8d))
- add encrypted development environment variables ([2bbf745](https://github.com/QQuik/quik_proximity_marketing/commit/2bbf7450d096cdb9f590a322de4f1724e9cdad2a))
- add log into dashboard route ([a537cd4](https://github.com/QQuik/quik_proximity_marketing/commit/a537cd4960d0551b6884a7571e2ca934807d0c34))
- add log into dashboard route ([719585b](https://github.com/QQuik/quik_proximity_marketing/commit/719585b6220eeabf8aecd479a3d51eefa614a516))
- add log into dashboard route ([94d3466](https://github.com/QQuik/quik_proximity_marketing/commit/94d3466b3b1d4b02b0c9f32232c839fad732584f))
- add log into refresh token for debug ([fb4b22d](https://github.com/QQuik/quik_proximity_marketing/commit/fb4b22d353fe76156ba250d4921b083f827e566e))
- add sourcemap to debug ([65434f9](https://github.com/QQuik/quik_proximity_marketing/commit/65434f9a9e1be50a8cb0e1424dde13f2c73c23fb))
- adding animation bounce update qr realtime interactions tabs double re render qr safari ([#420](https://github.com/QQuik/quik_proximity_marketing/issues/420)) ([6f26dc8](https://github.com/QQuik/quik_proximity_marketing/commit/6f26dc89c3407e7114beac969222a527739ba28e))
- adding redis event key push file ([#423](https://github.com/QQuik/quik_proximity_marketing/issues/423)) ([f571ae1](https://github.com/QQuik/quik_proximity_marketing/commit/f571ae19b12b49b55ef447f8e237346d80d64584))
- change text Analytic By Tag -> Basic Analytics ([b5b3ff3](https://github.com/QQuik/quik_proximity_marketing/commit/b5b3ff386282152fb7e982668358aacb76a656a9))
- **cicd:** add action to gemini review ([7b66448](https://github.com/QQuik/quik_proximity_marketing/commit/7b664488b3a75ebf8d0a980ecd9704e4d00e6b32))
- **cicd:** add action to gemini review ([22c780a](https://github.com/QQuik/quik_proximity_marketing/commit/22c780adbe6f54717ed234ecced04e7810b551c4))
- **cicd:** add sonar for workflow ([#459](https://github.com/QQuik/quik_proximity_marketing/issues/459)) ([d228fc3](https://github.com/QQuik/quik_proximity_marketing/commit/d228fc39d8aad3212748c85977183fee570efc1d))
- **cicd:** put sonar to PR only ([0812e79](https://github.com/QQuik/quik_proximity_marketing/commit/0812e796cf3cc35870a8969d647bfe0dc0dfc2c6))
- **cicd:** remove gemini review ([de6936d](https://github.com/QQuik/quik_proximity_marketing/commit/de6936d0d384f900f430ded7ddf215280b3d1620))
- **cicd:** update gemini model for review PR ([7b378d7](https://github.com/QQuik/quik_proximity_marketing/commit/7b378d734c174bc4405777924f55c30adf74a467))
- **cicd:** update gemini model for review PR ([d7e40e0](https://github.com/QQuik/quik_proximity_marketing/commit/d7e40e05a8e445134ea9c9a7b83c17932f077c49))
- disable auto meta tag generation for touch points ([cd6925d](https://github.com/QQuik/quik_proximity_marketing/commit/cd6925dc5731f1f6f6b1a000f5f28f202f51705d))
- disable auto meta tag generation for touch points ([7f46915](https://github.com/QQuik/quik_proximity_marketing/commit/7f4691515bc16b06f7b9420cda79052d7fa952fe))
- disable auto meta tags functionality in touch point service ([012693f](https://github.com/QQuik/quik_proximity_marketing/commit/012693f45aa086929ea62ab9fa3193ffc3920fd9))
- disable gen ai slug button and update translation file for ai … ([#421](https://github.com/QQuik/quik_proximity_marketing/issues/421)) ([a79df44](https://github.com/QQuik/quik_proximity_marketing/commit/a79df44f5958fa6a2668ac0acc440b5e975349b3))
- downgrade typescript to major version 5 ([c299a04](https://github.com/QQuik/quik_proximity_marketing/commit/c299a04506b67cd06c66d983a895561c3d9b1afb))
- exclude yarn.lock from review ([3a21e86](https://github.com/QQuik/quik_proximity_marketing/commit/3a21e869b86d065287a8eccf87a56e23dafc35e7))
- exclude yarn.lock from review ([ebbd182](https://github.com/QQuik/quik_proximity_marketing/commit/ebbd182a1cc9b013122c9e40bdde3f29fdff5543))
- fix text analytic visitors -> total ([32da4c6](https://github.com/QQuik/quik_proximity_marketing/commit/32da4c6af9bede8dfa4d4bfb3c5f6e9aa82318bd))
- just release on main ([b694a32](https://github.com/QQuik/quik_proximity_marketing/commit/b694a323ac1395b3340802018fe2a6018b28b737))
- **release:** 1.0.2-development.1 [skip ci] ([f11961c](https://github.com/QQuik/quik_proximity_marketing/commit/f11961c40c8d7b074fc1723f70e785b7779647ac))
- **release:** 1.0.2-development.2 [skip ci] ([9421abd](https://github.com/QQuik/quik_proximity_marketing/commit/9421abd65f77fed2f388d929fb2e4da73b2f4797))
- **release:** 1.0.2-development.3 [skip ci] ([db1465f](https://github.com/QQuik/quik_proximity_marketing/commit/db1465f7d8b0e004a6254a47d8a2a48645b6826e))
- **release:** 1.0.2-development.4 [skip ci] ([947d71b](https://github.com/QQuik/quik_proximity_marketing/commit/947d71b1086a781010bc9fb5f98083dd1a20b8b0))
- **release:** 1.0.2-development.5 [skip ci] ([b86fe6a](https://github.com/QQuik/quik_proximity_marketing/commit/b86fe6a80ae621add807ab48ed2d25b7ced6bf96))
- **release:** 1.1.0 [skip ci] ([eb39e34](https://github.com/QQuik/quik_proximity_marketing/commit/eb39e34d038b80ab84d72ae25a3d1cd506cc7cb7))
- **release:** 1.1.0 [skip ci] ([dfcdbcb](https://github.com/QQuik/quik_proximity_marketing/commit/dfcdbcb77c3e73dce694fcc5c0a6dba937c77c73))
- **release:** 1.1.0 [skip ci] ([a7acd04](https://github.com/QQuik/quik_proximity_marketing/commit/a7acd04da28f8a5b755933baeb5b8eba9d71d06a))
- **release:** 1.1.0 [skip ci] ([ab614bb](https://github.com/QQuik/quik_proximity_marketing/commit/ab614bbb0df1c403d711009fa7d974be43994e6f))
- **release:** 1.1.0 [skip ci] ([174439d](https://github.com/QQuik/quik_proximity_marketing/commit/174439d878cd770f68f26b2ce1e5fbd0ce22262d))
- **release:** 1.1.0 [skip ci] ([d7d4365](https://github.com/QQuik/quik_proximity_marketing/commit/d7d4365ad6cda9c551c5a9921f08df643cadcf36))
- **release:** 1.1.0-development.1 [skip ci] ([aa757c7](https://github.com/QQuik/quik_proximity_marketing/commit/aa757c7434563cd45db9e79db7846a0d3b9ce819))
- **release:** 1.1.0-development.10 [skip ci] ([ac730b5](https://github.com/QQuik/quik_proximity_marketing/commit/ac730b52256d7496eaa25695b06f15814a098814))
- **release:** 1.1.0-development.11 [skip ci] ([edd6605](https://github.com/QQuik/quik_proximity_marketing/commit/edd66053b9e6b2428f055271fbe64a5094b0eb96))
- **release:** 1.1.0-development.12 [skip ci] ([8ec2589](https://github.com/QQuik/quik_proximity_marketing/commit/8ec2589ae97bd6068869d4b400e3144f928c71fe))
- **release:** 1.1.0-development.13 [skip ci] ([ec92a43](https://github.com/QQuik/quik_proximity_marketing/commit/ec92a435197994a1874baf51e492fb71518a9eee))
- **release:** 1.1.0-development.14 [skip ci] ([b4fc66c](https://github.com/QQuik/quik_proximity_marketing/commit/b4fc66cd2d8a5969a2571b401c15daa7b6dfe836))
- **release:** 1.1.0-development.15 [skip ci] ([db85d96](https://github.com/QQuik/quik_proximity_marketing/commit/db85d96758eadba5d8b8fc77409e52b8080ca24e))
- **release:** 1.1.0-development.16 [skip ci] ([cddcb6b](https://github.com/QQuik/quik_proximity_marketing/commit/cddcb6b1f6d25744fc08f318ba2a9e0712a00bb1))
- **release:** 1.1.0-development.17 [skip ci] ([634b66b](https://github.com/QQuik/quik_proximity_marketing/commit/634b66bc9c5a69f9dda5924bd48c4c610410b435))
- **release:** 1.1.0-development.18 [skip ci] ([33c3f90](https://github.com/QQuik/quik_proximity_marketing/commit/33c3f903f26d546419b9c4eae831153a67204c35))
- **release:** 1.1.0-development.19 [skip ci] ([77b5687](https://github.com/QQuik/quik_proximity_marketing/commit/77b56870a026b21d56576e83ac8e0f5d5735bd22))
- **release:** 1.1.0-development.2 [skip ci] ([5dc3ab8](https://github.com/QQuik/quik_proximity_marketing/commit/5dc3ab81efc081924994fb4e0dbc5c34e42d3508))
- **release:** 1.1.0-development.20 [skip ci] ([d61efa7](https://github.com/QQuik/quik_proximity_marketing/commit/d61efa7429e69a91407cf4ca3aa02ab22f00bff0))
- **release:** 1.1.0-development.21 [skip ci] ([41bf92b](https://github.com/QQuik/quik_proximity_marketing/commit/41bf92bdb4aabaecd0cd0540cce5621e764aeb07))
- **release:** 1.1.0-development.22 [skip ci] ([11ba010](https://github.com/QQuik/quik_proximity_marketing/commit/11ba0109563ce89a091d0b9266d8b0daeb8d632f))
- **release:** 1.1.0-development.23 [skip ci] ([d292094](https://github.com/QQuik/quik_proximity_marketing/commit/d29209492b57450a441f911cf954fc9d33b065e2))
- **release:** 1.1.0-development.24 [skip ci] ([8c46aec](https://github.com/QQuik/quik_proximity_marketing/commit/8c46aec05408a294177fc636b5bbb77f31ce8ec7))
- **release:** 1.1.0-development.25 [skip ci] ([067630e](https://github.com/QQuik/quik_proximity_marketing/commit/067630e8b79848affd3f2b89fdb510744c7b3341))
- **release:** 1.1.0-development.26 [skip ci] ([18ed4fa](https://github.com/QQuik/quik_proximity_marketing/commit/18ed4fa9be3bc674ce7db8ab5b7beca9b583ca7a))
- **release:** 1.1.0-development.27 [skip ci] ([953a743](https://github.com/QQuik/quik_proximity_marketing/commit/953a743dcabacbc8901fe6c92e05bb710406459a))
- **release:** 1.1.0-development.28 [skip ci] ([441a6d7](https://github.com/QQuik/quik_proximity_marketing/commit/441a6d7211122457d76b821ba4e722c6df422898))
- **release:** 1.1.0-development.29 [skip ci] ([28c3bd4](https://github.com/QQuik/quik_proximity_marketing/commit/28c3bd469654fbb859693edbc39f7ff2f4441d11))
- **release:** 1.1.0-development.3 [skip ci] ([3e1fa05](https://github.com/QQuik/quik_proximity_marketing/commit/3e1fa05c584834a1910264be180b08ff8df9da51))
- **release:** 1.1.0-development.30 [skip ci] ([6a7b004](https://github.com/QQuik/quik_proximity_marketing/commit/6a7b004031e88e618d685868046c349de74ab271))
- **release:** 1.1.0-development.31 [skip ci] ([1f15e2d](https://github.com/QQuik/quik_proximity_marketing/commit/1f15e2dddd3126c0b00c11e435308f406d41d448))
- **release:** 1.1.0-development.32 [skip ci] ([cc60e10](https://github.com/QQuik/quik_proximity_marketing/commit/cc60e102df67af27d2f27c7b4f4f78b4cc77ab6b))
- **release:** 1.1.0-development.33 [skip ci] ([519cd33](https://github.com/QQuik/quik_proximity_marketing/commit/519cd3359339ad50a7e74852ad8ee7e8e4c816ce))
- **release:** 1.1.0-development.34 [skip ci] ([dfd2460](https://github.com/QQuik/quik_proximity_marketing/commit/dfd24602c2ebce32e46f29c7fa1f980b2b204370))
- **release:** 1.1.0-development.35 [skip ci] ([9ec6003](https://github.com/QQuik/quik_proximity_marketing/commit/9ec60034af04a8b22ecf2d61a42accc15c9d8079))
- **release:** 1.1.0-development.36 [skip ci] ([0c21524](https://github.com/QQuik/quik_proximity_marketing/commit/0c2152469b719e522c15b7a59c92a4246ef9efb5))
- **release:** 1.1.0-development.37 [skip ci] ([a967741](https://github.com/QQuik/quik_proximity_marketing/commit/a967741b1338114502ce980f072c0d34f6aa6be6))
- **release:** 1.1.0-development.38 [skip ci] ([b727d2a](https://github.com/QQuik/quik_proximity_marketing/commit/b727d2a0e995d63b7ed3de3b3725b888afaf5433))
- **release:** 1.1.0-development.39 [skip ci] ([0a2ce57](https://github.com/QQuik/quik_proximity_marketing/commit/0a2ce57e667cc02bb61a92e70b67016cba75e92a))
- **release:** 1.1.0-development.4 [skip ci] ([bc70fa8](https://github.com/QQuik/quik_proximity_marketing/commit/bc70fa8354145c3c4f77e567d801588b3e3b6243))
- **release:** 1.1.0-development.40 [skip ci] ([2074b20](https://github.com/QQuik/quik_proximity_marketing/commit/2074b202dc787a15629482860f5953fc4d7a7c53))
- **release:** 1.1.0-development.41 [skip ci] ([5aa6a14](https://github.com/QQuik/quik_proximity_marketing/commit/5aa6a149e7ff830a5d6525195080a95af9e11c12))
- **release:** 1.1.0-development.42 [skip ci] ([33344ca](https://github.com/QQuik/quik_proximity_marketing/commit/33344ca70f5b2b88658a5968d6e0632153f67aa2))
- **release:** 1.1.0-development.43 [skip ci] ([fe4c881](https://github.com/QQuik/quik_proximity_marketing/commit/fe4c881059f7f300a60fd1d90269b022034021d2))
- **release:** 1.1.0-development.44 [skip ci] ([559e2bc](https://github.com/QQuik/quik_proximity_marketing/commit/559e2bc2b98bcb2cdbdd782e44e95728e73c2d75))
- **release:** 1.1.0-development.45 [skip ci] ([3db5a94](https://github.com/QQuik/quik_proximity_marketing/commit/3db5a94d587ce5d48f42b39f5311c27d14ce4be6))
- **release:** 1.1.0-development.46 [skip ci] ([114ea84](https://github.com/QQuik/quik_proximity_marketing/commit/114ea84ee1107dc075c0a2373039eb8b039704db))
- **release:** 1.1.0-development.47 [skip ci] ([d40ae1a](https://github.com/QQuik/quik_proximity_marketing/commit/d40ae1ad1b8b765e2f4dc0035f88172de748d991))
- **release:** 1.1.0-development.48 [skip ci] ([1285efd](https://github.com/QQuik/quik_proximity_marketing/commit/1285efd50cccae99f8048e88715dc12da14836f7))
- **release:** 1.1.0-development.49 [skip ci] ([32ab711](https://github.com/QQuik/quik_proximity_marketing/commit/32ab7113cb7ae46036180cc597ac65827552fe82))
- **release:** 1.1.0-development.5 [skip ci] ([597b7fb](https://github.com/QQuik/quik_proximity_marketing/commit/597b7fbb6bc30db042c47050eec67ab8203080d0))
- **release:** 1.1.0-development.50 [skip ci] ([22f3577](https://github.com/QQuik/quik_proximity_marketing/commit/22f3577f8e1b0fada483e0e68caf983dd0a33d5d))
- **release:** 1.1.0-development.51 [skip ci] ([567edcf](https://github.com/QQuik/quik_proximity_marketing/commit/567edcfb0dfb01b033bd0efe2dc5cf382ebd8c0e))
- **release:** 1.1.0-development.52 [skip ci] ([34b0760](https://github.com/QQuik/quik_proximity_marketing/commit/34b0760333d92f909beeffbadc679403f220b6be))
- **release:** 1.1.0-development.53 [skip ci] ([8e9cfd7](https://github.com/QQuik/quik_proximity_marketing/commit/8e9cfd7be36d5bb17c6178f0e469d7f32be1060b))
- **release:** 1.1.0-development.54 [skip ci] ([d74b6ce](https://github.com/QQuik/quik_proximity_marketing/commit/d74b6ceea1373d044942fbebe789b53fc248bf1e))
- **release:** 1.1.0-development.55 [skip ci] ([2cd7951](https://github.com/QQuik/quik_proximity_marketing/commit/2cd7951abd7a07673de2e56a67e6f2b957a9ecda))
- **release:** 1.1.0-development.56 [skip ci] ([825be56](https://github.com/QQuik/quik_proximity_marketing/commit/825be56c144bb01bce135b9e96165369e369fa09))
- **release:** 1.1.0-development.57 [skip ci] ([43e9f7b](https://github.com/QQuik/quik_proximity_marketing/commit/43e9f7bea5b06b335961fa5cf7a393e73b310092))
- **release:** 1.1.0-development.58 [skip ci] ([26c1a4f](https://github.com/QQuik/quik_proximity_marketing/commit/26c1a4fa48968de30b4ba4f8f7317fa732d4eed4))
- **release:** 1.1.0-development.59 [skip ci] ([fdfff14](https://github.com/QQuik/quik_proximity_marketing/commit/fdfff14c5aec5646f85dfff0794ad02f39a2df86))
- **release:** 1.1.0-development.6 [skip ci] ([c705a14](https://github.com/QQuik/quik_proximity_marketing/commit/c705a147558579ff61b2081650acda959f8aec4f))
- **release:** 1.1.0-development.60 [skip ci] ([71b42aa](https://github.com/QQuik/quik_proximity_marketing/commit/71b42aad2bb356bb8879c2fe3ff89f85709f7964))
- **release:** 1.1.0-development.61 [skip ci] ([2a41805](https://github.com/QQuik/quik_proximity_marketing/commit/2a41805cff4d775cdf786de4cef4e92c40a76417))
- **release:** 1.1.0-development.62 [skip ci] ([74fae1f](https://github.com/QQuik/quik_proximity_marketing/commit/74fae1ffb2d8440395893c9fa5c46419872dd4f7))
- **release:** 1.1.0-development.63 [skip ci] ([3e78b07](https://github.com/QQuik/quik_proximity_marketing/commit/3e78b07e40b93b3a5584a63a1ffa65ab76009f33))
- **release:** 1.1.0-development.64 [skip ci] ([d6e7b7c](https://github.com/QQuik/quik_proximity_marketing/commit/d6e7b7c01df21102d334f1d0a85058bb31d43c55))
- **release:** 1.1.0-development.65 [skip ci] ([c10571f](https://github.com/QQuik/quik_proximity_marketing/commit/c10571f601ff7c69bd5f07bd53fa40dc701ad9db))
- **release:** 1.1.0-development.66 [skip ci] ([dd1760c](https://github.com/QQuik/quik_proximity_marketing/commit/dd1760c650946345dc9d9c3364436156d471f3a6))
- **release:** 1.1.0-development.67 [skip ci] ([a42853b](https://github.com/QQuik/quik_proximity_marketing/commit/a42853b6ff480e46b1f39e19531a0ab1a0a43cce))
- **release:** 1.1.0-development.68 [skip ci] ([e41bb6a](https://github.com/QQuik/quik_proximity_marketing/commit/e41bb6aeea273fe0991c9b72887d2eac3b0f4fc4))
- **release:** 1.1.0-development.69 [skip ci] ([b6f8152](https://github.com/QQuik/quik_proximity_marketing/commit/b6f8152ec6a2b901e6082959ade8f9f51cf2d210))
- **release:** 1.1.0-development.7 [skip ci] ([8568c4a](https://github.com/QQuik/quik_proximity_marketing/commit/8568c4a721b8433ce6280f99625fe3804f63ad26))
- **release:** 1.1.0-development.70 [skip ci] ([f3b7854](https://github.com/QQuik/quik_proximity_marketing/commit/f3b7854d68caf197b5404cfec6e2719fea979867))
- **release:** 1.1.0-development.71 [skip ci] ([3bb9d92](https://github.com/QQuik/quik_proximity_marketing/commit/3bb9d920ce6cc9feb1d5b8c3b5a9455d651d67f1))
- **release:** 1.1.0-development.72 [skip ci] ([a97d954](https://github.com/QQuik/quik_proximity_marketing/commit/a97d954d999b9dcf796a0bf8cc3bfcdee4cc2f17))
- **release:** 1.1.0-development.73 [skip ci] ([497b614](https://github.com/QQuik/quik_proximity_marketing/commit/497b61444cc538dce36f868918b09e6f8fefaba9))
- **release:** 1.1.0-development.74 [skip ci] ([21ec7c8](https://github.com/QQuik/quik_proximity_marketing/commit/21ec7c8248f4fe2456ab72a0f1ffd2cf4b5e2677))
- **release:** 1.1.0-development.75 [skip ci] ([6f16624](https://github.com/QQuik/quik_proximity_marketing/commit/6f16624960d354ede51cd26c8a54612391ee4c42))
- **release:** 1.1.0-development.76 [skip ci] ([2d121e7](https://github.com/QQuik/quik_proximity_marketing/commit/2d121e736e934b5a88de9e761b886e723a9ab367))
- **release:** 1.1.0-development.77 [skip ci] ([bc41e38](https://github.com/QQuik/quik_proximity_marketing/commit/bc41e38e3d07c3f9a95c70b04334e26f101b3454))
- **release:** 1.1.0-development.78 [skip ci] ([7da0baf](https://github.com/QQuik/quik_proximity_marketing/commit/7da0baf12d226ef16ccbf6173e0d9d3f266133a6))
- **release:** 1.1.0-development.79 [skip ci] ([8a85855](https://github.com/QQuik/quik_proximity_marketing/commit/8a858555ddfa892cb8aa3f4dd5a507e936cc9c2e))
- **release:** 1.1.0-development.8 [skip ci] ([e8181be](https://github.com/QQuik/quik_proximity_marketing/commit/e8181beae4e6089335fed26e05fa61eefa8008ef))
- **release:** 1.1.0-development.80 [skip ci] ([76f2cd7](https://github.com/QQuik/quik_proximity_marketing/commit/76f2cd797c3e75e0a9afe6b947d455d53925f930))
- **release:** 1.1.0-development.81 [skip ci] ([b155265](https://github.com/QQuik/quik_proximity_marketing/commit/b1552653b174cd11c55ce0850e666815b21f402c))
- **release:** 1.1.0-development.82 [skip ci] ([f228566](https://github.com/QQuik/quik_proximity_marketing/commit/f228566a39860cae8382d55a9eaf2eb0e72e30b0))
- **release:** 1.1.0-development.83 [skip ci] ([20b87d0](https://github.com/QQuik/quik_proximity_marketing/commit/20b87d06c7c1982caea15a8d30aa505d5e2ac033))
- **release:** 1.1.0-development.84 [skip ci] ([dc9541a](https://github.com/QQuik/quik_proximity_marketing/commit/dc9541af08815289a16cdef9d33c03419d67f6cb))
- **release:** 1.1.0-development.85 [skip ci] ([46cfb1f](https://github.com/QQuik/quik_proximity_marketing/commit/46cfb1f0ad9942fa1565eae7d1b0e114f02febab))
- **release:** 1.1.0-development.86 [skip ci] ([d562d89](https://github.com/QQuik/quik_proximity_marketing/commit/d562d89994b9addf10125269a3e7640d64202277))
- **release:** 1.1.0-development.87 [skip ci] ([66f9c50](https://github.com/QQuik/quik_proximity_marketing/commit/66f9c509a62cfedebcca99fe18c6138be4821d37))
- **release:** 1.1.0-development.88 [skip ci] ([c79d056](https://github.com/QQuik/quik_proximity_marketing/commit/c79d056071d2f00b51039ae298c490873b64edba))
- **release:** 1.1.0-development.9 [skip ci] ([ef57798](https://github.com/QQuik/quik_proximity_marketing/commit/ef57798d272e969223fab870a7db99ee8660630c))
- remove debug logging statements from touchpoint migration ([c0a815e](https://github.com/QQuik/quik_proximity_marketing/commit/c0a815e2fe29e5f2248d123aaf98e88ad36be97c))
- remove sentry to show source map ([607bdbd](https://github.com/QQuik/quik_proximity_marketing/commit/607bdbd3d3a1204e87c48960ab5d4561db52d45f))
- remove sourcemap ([dc34fb9](https://github.com/QQuik/quik_proximity_marketing/commit/dc34fb9df7486b2143f30f17ad4c1e9290e6933c))
- replace FZ Poppins with BeVietnamPro font family and update button styles ([e6174c2](https://github.com/QQuik/quik_proximity_marketing/commit/e6174c2f1c0b4d320e5114f3b55e17131415ace4))
- restructure some file/folder ([#357](https://github.com/QQuik/quik_proximity_marketing/issues/357)) ([348ef07](https://github.com/QQuik/quik_proximity_marketing/commit/348ef07e6c98ee788953a0834d652798123c1a9d))
- temporarily disable CombinedFilter and CurrentFilters components in analytics view ([b7bc9f1](https://github.com/QQuik/quik_proximity_marketing/commit/b7bc9f1b8ad14cae873428f5fd676676d4716230))
- update cicd ([b89a6df](https://github.com/QQuik/quik_proximity_marketing/commit/b89a6df6597916cb5f6b4919aa693060b6974ee9))
- update dev env encoded ([e9096c3](https://github.com/QQuik/quik_proximity_marketing/commit/e9096c33ff3fb8d7ac1d709ffb7c57b3747fa84e))
- update encrypted development environment variables ([f5d9e1f](https://github.com/QQuik/quik_proximity_marketing/commit/f5d9e1f9e59f78ece240fb21bee1a3b11a7cac27))
- update encrypted development environment variables ([80d5457](https://github.com/QQuik/quik_proximity_marketing/commit/80d545799196e3f2e1d159e3baaeded115d125d1))
- update env ([89266f6](https://github.com/QQuik/quik_proximity_marketing/commit/89266f669be74fa640ff3146d9849b156e118f59))
- update error message and remove endOfLine config in prettier ([f6cd34a](https://github.com/QQuik/quik_proximity_marketing/commit/f6cd34a5af907faa5545ddb56ef1e2328c321b57))
- update lockable section groupcss name ([4a6d86c](https://github.com/QQuik/quik_proximity_marketing/commit/4a6d86c2ba6b6b310efc9fc344e03b1546bbd9c3))
- update minor detail ([#384](https://github.com/QQuik/quik_proximity_marketing/issues/384)) ([82a9646](https://github.com/QQuik/quik_proximity_marketing/commit/82a96469ba662990510632e32725231eaab3bc58))
- update prettier ([eda7999](https://github.com/QQuik/quik_proximity_marketing/commit/eda7999709c526540326ddf5d65b6c1e5e1fbfc3))
- update readme for project structure ([98d2f57](https://github.com/QQuik/quik_proximity_marketing/commit/98d2f5701dbf583895a8a101869838c30b84bf09))
- update releaserc json ([92568df](https://github.com/QQuik/quik_proximity_marketing/commit/92568df4f866a9da9701cda7c727eeed975cd621))
- update translation and return text ([#385](https://github.com/QQuik/quik_proximity_marketing/issues/385)) ([31b0f04](https://github.com/QQuik/quik_proximity_marketing/commit/31b0f0478988c14ccf8a8a3f656707791081fbef))
- update translation files ([#374](https://github.com/QQuik/quik_proximity_marketing/issues/374)) ([03a2d9b](https://github.com/QQuik/quik_proximity_marketing/commit/03a2d9b11c7b8e1af12d15a7543b003a4c42b996))
- update translation for UX ([#383](https://github.com/QQuik/quik_proximity_marketing/issues/383)) ([73523f8](https://github.com/QQuik/quik_proximity_marketing/commit/73523f82cf6e2a708436c7ad812648211bdeced5))
- update UI bugs ([#446](https://github.com/QQuik/quik_proximity_marketing/issues/446)) ([635d141](https://github.com/QQuik/quik_proximity_marketing/commit/635d141195b9fc450b6c7bfad33a44f1aa312b61))
- update using hook usedayjs topperformance tp text ([#377](https://github.com/QQuik/quik_proximity_marketing/issues/377)) ([91fce81](https://github.com/QQuik/quik_proximity_marketing/commit/91fce81eab6543a983e6a5ea5cc00dcdaaa97274))
- update width select column query key qr list ([#450](https://github.com/QQuik/quik_proximity_marketing/issues/450)) ([38c94b0](https://github.com/QQuik/quik_proximity_marketing/commit/38c94b0ad2bb85292c633783ae57a9f855b7756c))
- use dayjs shared lib ([#378](https://github.com/QQuik/quik_proximity_marketing/issues/378)) ([348a284](https://github.com/QQuik/quik_proximity_marketing/commit/348a28466893b0553034fd08bb42c70f5807b8da))

### 🎨 Code Style

- add skeleton for smooth ([f3184b0](https://github.com/QQuik/quik_proximity_marketing/commit/f3184b05e51d9d372a14d3b21f4c7ad9965d77a9))
- adding style inherit to override default style of sonner ([#345](https://github.com/QQuik/quik_proximity_marketing/issues/345)) ([309912d](https://github.com/QQuik/quik_proximity_marketing/commit/309912dc50d1d63aba35dd2550e691651dd60f6b))
- fix border & try to fix qr download ([184cd56](https://github.com/QQuik/quik_proximity_marketing/commit/184cd560bb819abfd2d64c49a2352d6a1d799f7c))
- fix chart pie in analytic page ([14b7599](https://github.com/QQuik/quik_proximity_marketing/commit/14b7599bd11b5aff591662b2a1add2f0263d6cea))
- fix color chart ([10df64e](https://github.com/QQuik/quik_proximity_marketing/commit/10df64e5e4643ea8f85b2498133d99d4d653a230))
- fix color for toast description on darktheme ([dcaf507](https://github.com/QQuik/quik_proximity_marketing/commit/dcaf5078efbf8e4df1015d12fe2c1b14cf3d1b4a))
- make advanced analytic's last 2 tabs not clickable ([f9e2cdb](https://github.com/QQuik/quik_proximity_marketing/commit/f9e2cdb00d0120a4a583e106d27e9911ad90a7d0))
- remove deployment dependency from semantic release job ([e09766f](https://github.com/QQuik/quik_proximity_marketing/commit/e09766feb9750e244eb73e1193d5846c03542257))
- update chart color ([24f50f6](https://github.com/QQuik/quik_proximity_marketing/commit/24f50f62f5ed0499781b1b9b2b226fa3c6330f59))
- update QR code styling with square dots and corners, adjust UI spacing ([05c3b63](https://github.com/QQuik/quik_proximity_marketing/commit/05c3b637cfe4224c77e85691313e0a7859180471))
- update secondary color to purple in dark theme ([63a465a](https://github.com/QQuik/quik_proximity_marketing/commit/63a465af42026f4e02540d1420a81ccfa67d0cf1))
- update style for not misunderstanding ([4587567](https://github.com/QQuik/quik_proximity_marketing/commit/45875674ddfb80ba28b7b572a87f8229af97895b))
- update UI components with consistent sizing and improved visual design ([6655908](https://github.com/QQuik/quik_proximity_marketing/commit/6655908bc816baceed55814406d52334ebcfe983))

### 🚀 Performance Improvements

- implement code splitting and optimize package imports for better performance ([#431](https://github.com/QQuik/quik_proximity_marketing/issues/431)) ([f5426b4](https://github.com/QQuik/quik_proximity_marketing/commit/f5426b4b589d8c110e671d2f183f4d3ee1e60e9f))

## [1.1.0-development.89](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.88...v1.1.0-development.89) (2025-09-29)

### 🐛 Bug Fixes

- hide performance overview + back btn in tp detail ([63ec355](https://github.com/QQuik/quik_proximity_marketing/commit/63ec355645f08c5c19456fffd33c61fcdc818750))

### Chore

- **cicd:** add action to gemini review ([22c780a](https://github.com/QQuik/quik_proximity_marketing/commit/22c780adbe6f54717ed234ecced04e7810b551c4))
- **cicd:** remove gemini review ([de6936d](https://github.com/QQuik/quik_proximity_marketing/commit/de6936d0d384f900f430ded7ddf215280b3d1620))
- **cicd:** update gemini model for review PR ([d7e40e0](https://github.com/QQuik/quik_proximity_marketing/commit/d7e40e05a8e445134ea9c9a7b83c17932f077c49))
- disable auto meta tag generation for touch points ([cd6925d](https://github.com/QQuik/quik_proximity_marketing/commit/cd6925dc5731f1f6f6b1a000f5f28f202f51705d))
- disable auto meta tags functionality in touch point service ([012693f](https://github.com/QQuik/quik_proximity_marketing/commit/012693f45aa086929ea62ab9fa3193ffc3920fd9))
- exclude yarn.lock from review ([ebbd182](https://github.com/QQuik/quik_proximity_marketing/commit/ebbd182a1cc9b013122c9e40bdde3f29fdff5543))
- **release:** 1.1.0 [skip ci] ([eb39e34](https://github.com/QQuik/quik_proximity_marketing/commit/eb39e34d038b80ab84d72ae25a3d1cd506cc7cb7))
- **release:** 1.1.0 [skip ci] ([dfcdbcb](https://github.com/QQuik/quik_proximity_marketing/commit/dfcdbcb77c3e73dce694fcc5c0a6dba937c77c73))
- **release:** 1.1.0 [skip ci] ([a7acd04](https://github.com/QQuik/quik_proximity_marketing/commit/a7acd04da28f8a5b755933baeb5b8eba9d71d06a))
- **release:** 1.1.0 [skip ci] ([ab614bb](https://github.com/QQuik/quik_proximity_marketing/commit/ab614bbb0df1c403d711009fa7d974be43994e6f))
- **release:** 1.1.0 [skip ci] ([174439d](https://github.com/QQuik/quik_proximity_marketing/commit/174439d878cd770f68f26b2ce1e5fbd0ce22262d))
- **release:** 1.1.0 [skip ci] ([d7d4365](https://github.com/QQuik/quik_proximity_marketing/commit/d7d4365ad6cda9c551c5a9921f08df643cadcf36))

## [1.1.0-development.88](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.87...v1.1.0-development.88) (2025-09-26)

### 🐛 Bug Fixes

- error on tree select ([9c2c974](https://github.com/QQuik/quik_proximity_marketing/commit/9c2c9748cdc00533f2e9f9957e5dbe6514466a5b))
- plan check for create tp anon ([a5c37f0](https://github.com/QQuik/quik_proximity_marketing/commit/a5c37f005da0198b43ebb7184fd0df703994f605))
- remove react context ([9748616](https://github.com/QQuik/quik_proximity_marketing/commit/9748616ea8956b1bee29ca89cbda6cfc5207ca17))

### 🛠 Updates

- change default url ([#474](https://github.com/QQuik/quik_proximity_marketing/issues/474)) ([2cb735f](https://github.com/QQuik/quik_proximity_marketing/commit/2cb735f46f01adb61bcb02ba6fdbacf73adc52a7))

## [1.1.0-development.87](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.86...v1.1.0-development.87) (2025-09-26)

### 🐛 Bug Fixes

- env de ([6f365ca](https://github.com/QQuik/quik_proximity_marketing/commit/6f365caebb0b7d80dec84ff0289e8a3da0cc22bf))

### ♻️ Code Refactoring

- upgrade tailwind to v4 ([#473](https://github.com/QQuik/quik_proximity_marketing/issues/473)) ([6ee8dab](https://github.com/QQuik/quik_proximity_marketing/commit/6ee8dab91513df98f3708d13d11c0aaf7f10a8d0))

## [1.1.0-development.86](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.85...v1.1.0-development.86) (2025-09-25)

### 🐛 Bug Fixes

- create tp form ([71f12f1](https://github.com/QQuik/quik_proximity_marketing/commit/71f12f1d6553829754c6adccab186927ca87d2bb))

## [1.1.0-development.85](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.84...v1.1.0-development.85) (2025-09-25)

### 🐛 Bug Fixes

- remove eval for security ([#464](https://github.com/QQuik/quik_proximity_marketing/issues/464)) ([d450cd9](https://github.com/QQuik/quik_proximity_marketing/commit/d450cd91385600dc31e1e523c55a741b4a6a0153))

### 🛠 Updates

- auto switch tab to qr code if generate by create qr code ([#463](https://github.com/QQuik/quik_proximity_marketing/issues/463)) ([e65bea3](https://github.com/QQuik/quik_proximity_marketing/commit/e65bea3aa8ad5e0794da64fed6dd57d0ed91d99c))
- code syntax ([#465](https://github.com/QQuik/quik_proximity_marketing/issues/465)) ([80ab7ad](https://github.com/QQuik/quik_proximity_marketing/commit/80ab7ad4b1c330014df668da3e66d192eecdd637))
- remove package next server ([#462](https://github.com/QQuik/quik_proximity_marketing/issues/462)) ([4b30473](https://github.com/QQuik/quik_proximity_marketing/commit/4b304735f8178f18e5905879ac4e4d95deef1167))
- using iconLeft instead of using children ([#458](https://github.com/QQuik/quik_proximity_marketing/issues/458)) ([e18def7](https://github.com/QQuik/quik_proximity_marketing/commit/e18def7263b9f9eb88488703d82d792eb2777d8d))

### Chore

- **cicd:** add action to gemini review ([7b66448](https://github.com/QQuik/quik_proximity_marketing/commit/7b664488b3a75ebf8d0a980ecd9704e4d00e6b32))
- **cicd:** add sonar for workflow ([#459](https://github.com/QQuik/quik_proximity_marketing/issues/459)) ([d228fc3](https://github.com/QQuik/quik_proximity_marketing/commit/d228fc39d8aad3212748c85977183fee570efc1d))
- **cicd:** put sonar to PR only ([0812e79](https://github.com/QQuik/quik_proximity_marketing/commit/0812e796cf3cc35870a8969d647bfe0dc0dfc2c6))
- **cicd:** update gemini model for review PR ([7b378d7](https://github.com/QQuik/quik_proximity_marketing/commit/7b378d734c174bc4405777924f55c30adf74a467))
- exclude yarn.lock from review ([3a21e86](https://github.com/QQuik/quik_proximity_marketing/commit/3a21e869b86d065287a8eccf87a56e23dafc35e7))

## [1.1.0-development.84](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.83...v1.1.0-development.84) (2025-09-24)

### 🐛 Bug Fixes

- dashboard crash by data undifined ([08c3110](https://github.com/QQuik/quik_proximity_marketing/commit/08c31101564785ae7385df4acfd0ed6b54a0afab))
- querykey tag detail ([#457](https://github.com/QQuik/quik_proximity_marketing/issues/457)) ([3478fd2](https://github.com/QQuik/quik_proximity_marketing/commit/3478fd23ab77b5c7c832c69c67c0c7b6122ca3a5))

## [1.1.0-development.83](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.82...v1.1.0-development.83) (2025-09-24)

### 🐛 Bug Fixes

- env local ([dc6c5c8](https://github.com/QQuik/quik_proximity_marketing/commit/dc6c5c864ae2d1eb4f9ae0dfe79bddc7f652d779))

### 🛠 Updates

- querykey for tag detail and max character display for name tp… ([#456](https://github.com/QQuik/quik_proximity_marketing/issues/456)) ([9349668](https://github.com/QQuik/quik_proximity_marketing/commit/934966816a16e3a6ad7b37c2b3d6c911451b2a3b))

### 🎨 Code Style

- fix border & try to fix qr download ([184cd56](https://github.com/QQuik/quik_proximity_marketing/commit/184cd560bb819abfd2d64c49a2352d6a1d799f7c))

## [1.1.0-development.82](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.81...v1.1.0-development.82) (2025-09-24)

### 🐛 Bug Fixes

- change env & fix api for tags ([be08057](https://github.com/QQuik/quik_proximity_marketing/commit/be08057682be4fff39f21fde529d5d8fefcf64c9))

### 🛠 Updates

- create tp with advance custom customize ([#454](https://github.com/QQuik/quik_proximity_marketing/issues/454)) ([f34dee4](https://github.com/QQuik/quik_proximity_marketing/commit/f34dee43ec5577e65aecd6a09b80bf13ccc3b34d))
- ui change padding & slug schema ([#455](https://github.com/QQuik/quik_proximity_marketing/issues/455)) ([7b9963b](https://github.com/QQuik/quik_proximity_marketing/commit/7b9963bcdee37611cb5618f6e8498d85ff7e4789))

## [1.1.0-development.81](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.80...v1.1.0-development.81) (2025-09-24)

### 🐛 Bug Fixes

- copy qr on svg type ([1c25899](https://github.com/QQuik/quik_proximity_marketing/commit/1c25899e29bee1f9965cd3f3baa4925213324dab))

## [1.1.0-development.80](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.79...v1.1.0-development.80) (2025-09-24)

### 🐛 Bug Fixes

- metatag error ([7dbb596](https://github.com/QQuik/quik_proximity_marketing/commit/7dbb596a1fbfb6469d588e5b8af1424b1a7713ac))

## [1.1.0-development.79](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.78...v1.1.0-development.79) (2025-09-24)

### 🐛 Bug Fixes

- ts error on blob type ([38c4a60](https://github.com/QQuik/quik_proximity_marketing/commit/38c4a60d085525a8e237330f3f9bb81ab10c05dd))
- typescript error on blob type ([deea737](https://github.com/QQuik/quik_proximity_marketing/commit/deea7374861286cf4433bcf4a1f568de34ea2026))

### 🛠 Updates

- add copy btn in qr result ([e9ca6b0](https://github.com/QQuik/quik_proximity_marketing/commit/e9ca6b0889fc63d4a6f5541c889d3a515e64ac65))
- fix and create new tp v0.1 ([#453](https://github.com/QQuik/quik_proximity_marketing/issues/453)) ([54ec83f](https://github.com/QQuik/quik_proximity_marketing/commit/54ec83f19639735c3ae846574a738c0323139091))

## [1.1.0-development.78](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.77...v1.1.0-development.78) (2025-09-23)

### 🐛 Bug Fixes

- refresh token error ([4284e2c](https://github.com/QQuik/quik_proximity_marketing/commit/4284e2ce41da3965a80ebc5fb131f7e8a39965ab))

## [1.1.0-development.77](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.76...v1.1.0-development.77) (2025-09-23)

### ✨ Features

- add openobserve browser rum ([7d9a2fd](https://github.com/QQuik/quik_proximity_marketing/commit/7d9a2fd61161ad08e43801bd5c3798ff773999a8))

## [1.1.0-development.76](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.75...v1.1.0-development.76) (2025-09-22)

### 🐛 Bug Fixes

- wrong logic when add tp into tag ([7af645f](https://github.com/QQuik/quik_proximity_marketing/commit/7af645f1eef7bab343e0d20fe85d98bd0b32d294))

### 🎨 Code Style

- fix color chart ([10df64e](https://github.com/QQuik/quik_proximity_marketing/commit/10df64e5e4643ea8f85b2498133d99d4d653a230))
- update chart color ([24f50f6](https://github.com/QQuik/quik_proximity_marketing/commit/24f50f62f5ed0499781b1b9b2b226fa3c6330f59))

## [1.1.0-development.75](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.74...v1.1.0-development.75) (2025-09-22)

### 🐛 Bug Fixes

- refresh token make duplicate cookie ([a7a8b65](https://github.com/QQuik/quik_proximity_marketing/commit/a7a8b653cbe06bd1c33f5c958ccb6be4417055a9))

### Chore

- add log into refresh token for debug ([fb4b22d](https://github.com/QQuik/quik_proximity_marketing/commit/fb4b22d353fe76156ba250d4921b083f827e566e))

## [1.1.0-development.74](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.73...v1.1.0-development.74) (2025-09-22)

### ✨ Features

- create qr svg when user create tp ([199eb61](https://github.com/QQuik/quik_proximity_marketing/commit/199eb617138f3a6cd564c9b87cd589dec7efc0bf))

## [1.1.0-development.73](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.72...v1.1.0-development.73) (2025-09-19)

### 🐛 Bug Fixes

- ui update for dashboard ([4f3498a](https://github.com/QQuik/quik_proximity_marketing/commit/4f3498a901156457b15cbd435f3fa788c1c607d0))

### 🛠 Updates

- translation and tag badges ([#448](https://github.com/QQuik/quik_proximity_marketing/issues/448)) ([494d7f1](https://github.com/QQuik/quik_proximity_marketing/commit/494d7f1ff5dfb1054c55baed56509cc0564a948a))

### Chore

- update UI bugs ([#446](https://github.com/QQuik/quik_proximity_marketing/issues/446)) ([635d141](https://github.com/QQuik/quik_proximity_marketing/commit/635d141195b9fc450b6c7bfad33a44f1aa312b61))
- update width select column query key qr list ([#450](https://github.com/QQuik/quik_proximity_marketing/issues/450)) ([38c94b0](https://github.com/QQuik/quik_proximity_marketing/commit/38c94b0ad2bb85292c633783ae57a9f855b7756c))

## [1.1.0-development.72](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.71...v1.1.0-development.72) (2025-09-18)

### ✨ Features

- add name validation to touch point update schema with min/max length ([83869e9](https://github.com/QQuik/quik_proximity_marketing/commit/83869e95b93766ef88244466c7127a4a9be4ccf2))

### 🐛 Bug Fixes

- show full QR customization form when QR code is dirty ([61ffd42](https://github.com/QQuik/quik_proximity_marketing/commit/61ffd42b26fcab5c6e9c79adf5759a88180c6d97))

## [1.1.0-development.71](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.70...v1.1.0-development.71) (2025-09-18)

### ✨ Features

- add maxLength validation to tag inputs with 32 character limit ([f8d031f](https://github.com/QQuik/quik_proximity_marketing/commit/f8d031fe0a2d4f78708d55baf5dcea39736e57a0))

### 🎨 Code Style

- update QR code styling with square dots and corners, adjust UI spacing ([05c3b63](https://github.com/QQuik/quik_proximity_marketing/commit/05c3b637cfe4224c77e85691313e0a7859180471))

## [1.1.0-development.70](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.69...v1.1.0-development.70) (2025-09-18)

### ✨ Features

- add form dirty state tracking and reset functionality for QR customization ([ed893e4](https://github.com/QQuik/quik_proximity_marketing/commit/ed893e4c9f275e291118e46e290a4b637a237cda))

## [1.1.0-development.69](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.68...v1.1.0-development.69) (2025-09-18)

### 🐛 Bug Fixes

- use QR customization options from created touch point instead of default options ([bd816a2](https://github.com/QQuik/quik_proximity_marketing/commit/bd816a298a75493a567a4a0004f5d55e81a6d9da))
- wrap ArrayBuffer in Uint8Array when creating Blob/File for QR code images ([cfccb09](https://github.com/QQuik/quik_proximity_marketing/commit/cfccb09cad9767c3b30947a23a4e5cd6c552d1b5))

### 🛠 Updates

- qr options client ([#445](https://github.com/QQuik/quik_proximity_marketing/issues/445)) ([1b5d23a](https://github.com/QQuik/quik_proximity_marketing/commit/1b5d23a8ebf9afaf8919eedfdc61a746bdeb5c1d))

### Chore

- downgrade typescript to major version 5 ([c299a04](https://github.com/QQuik/quik_proximity_marketing/commit/c299a04506b67cd06c66d983a895561c3d9b1afb))

## [1.1.0-development.68](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.67...v1.1.0-development.68) (2025-09-18)

### ✨ Features

- add host to allowed CORS headers in middleware ([09e8d1b](https://github.com/QQuik/quik_proximity_marketing/commit/09e8d1b90718c59043db6c141cf4a196f0d292c8))

### 🛠 Updates

- text remove download shortlink list ([#444](https://github.com/QQuik/quik_proximity_marketing/issues/444)) ([1a0ab8f](https://github.com/QQuik/quik_proximity_marketing/commit/1a0ab8f2755a12ff9906f7000471777a32b9cc9f))

## [1.1.0-development.67](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.66...v1.1.0-development.67) (2025-09-18)

### 🐛 Bug Fixes

- use full domain with shortcode instead of shortUrl for QR code generation ([24c8a9f](https://github.com/QQuik/quik_proximity_marketing/commit/24c8a9fe1360df32f4a2c7d3e5b0318ee7bddd94))

### ♻️ Code Refactoring

- remove loading state and spinner from QR code rendering component ([e1be078](https://github.com/QQuik/quik_proximity_marketing/commit/e1be0781ce233128097a50adb4f088a4e6c510d8))
- reorganize Dockerfile layers and enhance button component with icon positioning support ([e85b063](https://github.com/QQuik/quik_proximity_marketing/commit/e85b063cbcf2a8e63f22e64614e51ccd9068cb9f))

### Chore

- replace FZ Poppins with BeVietnamPro font family and update button styles ([e6174c2](https://github.com/QQuik/quik_proximity_marketing/commit/e6174c2f1c0b4d320e5114f3b55e17131415ace4))

## [1.1.0-development.66](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.65...v1.1.0-development.66) (2025-09-17)

### 🐛 Bug Fixes

- add ts-ignore to suppress type error in QR color options update ([4aeaf58](https://github.com/QQuik/quik_proximity_marketing/commit/4aeaf586840a9bb74a95f81847daa0caceb6811e))
- dockerfile for node-canvas ([c59ca22](https://github.com/QQuik/quik_proximity_marketing/commit/c59ca228a4fbb7a1f7ff830c7af2267fdb923c3e))
- update Docker dependencies for node-canvas and add ts-ignore comments for type safety ([a93fe19](https://github.com/QQuik/quik_proximity_marketing/commit/a93fe1926648a428f30ea644eeffe9b5cb0af986))
- update Dockerfile to properly install node-canvas dependencies in base image ([8587468](https://github.com/QQuik/quik_proximity_marketing/commit/858746885afb35fec2006d3a5befa2703d4f5fb0))

### 🛠 Updates

- improve UI dashboard & save qr image when insert/update tp ([#439](https://github.com/QQuik/quik_proximity_marketing/issues/439)) ([b366ca0](https://github.com/QQuik/quik_proximity_marketing/commit/b366ca072ffbda052b868e77c1a099c6e626919d))
- list qr and shortlink ([#436](https://github.com/QQuik/quik_proximity_marketing/issues/436)) ([f9f80ba](https://github.com/QQuik/quik_proximity_marketing/commit/f9f80ba820b191c40faf8f693ba28ddefa7c0797))

### Chore

- disable auto meta tag generation for touch points ([7f46915](https://github.com/QQuik/quik_proximity_marketing/commit/7f4691515bc16b06f7b9420cda79052d7fa952fe))
- update encrypted development environment variables ([f5d9e1f](https://github.com/QQuik/quik_proximity_marketing/commit/f5d9e1f9e59f78ece240fb21bee1a3b11a7cac27))

### 🎨 Code Style

- update UI components with consistent sizing and improved visual design ([6655908](https://github.com/QQuik/quik_proximity_marketing/commit/6655908bc816baceed55814406d52334ebcfe983))

## [1.1.0-development.65](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.64...v1.1.0-development.65) (2025-09-16)

### ✨ Features

- add service-to-service authentication with API key validation ([#432](https://github.com/QQuik/quik_proximity_marketing/issues/432)) ([29ec851](https://github.com/QQuik/quik_proximity_marketing/commit/29ec8518c555bad37af77bdde2f86e1362268199))

## [1.1.0-development.64](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.63...v1.1.0-development.64) (2025-09-16)

### 🚀 Performance Improvements

- implement code splitting and optimize package imports for better performance ([#431](https://github.com/QQuik/quik_proximity_marketing/issues/431)) ([f5426b4](https://github.com/QQuik/quik_proximity_marketing/commit/f5426b4b589d8c110e671d2f183f4d3ee1e60e9f))

## [1.1.0-development.63](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.62...v1.1.0-development.63) (2025-09-15)

### 🐛 Bug Fixes

- reduce use effect qr render ([#427](https://github.com/QQuik/quik_proximity_marketing/issues/427)) ([ad7d397](https://github.com/QQuik/quik_proximity_marketing/commit/ad7d3976ddbb70d99fad6b345bdf2a7274b23e5c))

### 🛠 Updates

- app sidebar v0.1 ([#425](https://github.com/QQuik/quik_proximity_marketing/issues/425)) ([6217700](https://github.com/QQuik/quik_proximity_marketing/commit/621770089b2af28a9018c807d01eab70e2f10094))
- dashboard new UI ([#429](https://github.com/QQuik/quik_proximity_marketing/issues/429)) ([3fac90a](https://github.com/QQuik/quik_proximity_marketing/commit/3fac90a92fd1224c33cb36b41eab37afb28b79e1))

### Chore

- adding redis event key push file ([#423](https://github.com/QQuik/quik_proximity_marketing/issues/423)) ([f571ae1](https://github.com/QQuik/quik_proximity_marketing/commit/f571ae19b12b49b55ef447f8e237346d80d64584))

### 🎨 Code Style

- update secondary color to purple in dark theme ([63a465a](https://github.com/QQuik/quik_proximity_marketing/commit/63a465af42026f4e02540d1420a81ccfa67d0cf1))

## [1.1.0-development.62](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.61...v1.1.0-development.62) (2025-09-11)

### ✨ Features

- add download button for QR code in migrated anonymous dialog ([cd884bb](https://github.com/QQuik/quik_proximity_marketing/commit/cd884bb08e84e7c17b4eaddbe492c2b867aeead3))

## [1.1.0-development.61](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.60...v1.1.0-development.61) (2025-09-11)

### ✨ Features

- implement anon migration with pending touch points and user profile API ([#422](https://github.com/QQuik/quik_proximity_marketing/issues/422)) ([bd22dd9](https://github.com/QQuik/quik_proximity_marketing/commit/bd22dd9698ec67a76084dce2508b8fcd595cc143))

### 🛠 Updates

- adding feature export tp file ([#418](https://github.com/QQuik/quik_proximity_marketing/issues/418)) ([c8068df](https://github.com/QQuik/quik_proximity_marketing/commit/c8068df90ac147c53586b51b2e1677249b93a269))

### ♻️ Code Refactoring

- migrate from CampaignContentType to TouchPointContentType enum ([c89f26b](https://github.com/QQuik/quik_proximity_marketing/commit/c89f26b639a1e775aa8b12cb6618d19db70c2031))

### Chore

- adding animation bounce update qr realtime interactions tabs double re render qr safari ([#420](https://github.com/QQuik/quik_proximity_marketing/issues/420)) ([6f26dc8](https://github.com/QQuik/quik_proximity_marketing/commit/6f26dc89c3407e7114beac969222a527739ba28e))
- disable gen ai slug button and update translation file for ai … ([#421](https://github.com/QQuik/quik_proximity_marketing/issues/421)) ([a79df44](https://github.com/QQuik/quik_proximity_marketing/commit/a79df44f5958fa6a2668ac0acc440b5e975349b3))

## [1.1.0-development.60](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.59...v1.1.0-development.60) (2025-09-09)

### 🐛 Bug Fixes

- qr-customize-in-app-load-wrong-options by remove hard code color ([#417](https://github.com/QQuik/quik_proximity_marketing/issues/417)) ([4f1c5a5](https://github.com/QQuik/quik_proximity_marketing/commit/4f1c5a58f305e4878ea8f8b3b653e0e32fd76e6b))

### 🛠 Updates

- arrow back and log out button ([#415](https://github.com/QQuik/quik_proximity_marketing/issues/415)) ([636b926](https://github.com/QQuik/quik_proximity_marketing/commit/636b92689e34c0c77a7321d3e281ae92a08f79f8))

## [1.1.0-development.59](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.58...v1.1.0-development.59) (2025-09-09)

### ✨ Features

- add QR logo image upload and customize options for touch points ([3f176fd](https://github.com/QQuik/quik_proximity_marketing/commit/3f176fda1ff5f758b74958f6db21c3235a7867e4))

### ♻️ Code Refactoring

- use provided message as default error message instead of hardcoded strings ([e8188ac](https://github.com/QQuik/quik_proximity_marketing/commit/e8188acbfea5594734244217045099b3cce2b98e))

## [1.1.0-development.58](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.57...v1.1.0-development.58) (2025-09-09)

### 🐛 Bug Fixes

- include 403 status in token refresh interceptor logic ([db1f155](https://github.com/QQuik/quik_proximity_marketing/commit/db1f1558323eaed7f92d899fd21600afd2da5892))

### 🛠 Updates

- ai slug UI v2.1 ([#412](https://github.com/QQuik/quik_proximity_marketing/issues/412)) ([aa2b1a7](https://github.com/QQuik/quik_proximity_marketing/commit/aa2b1a7642c805088b9c6d3322035afff9a7f165))
- change default options of qr to match with qr in landing page ([#413](https://github.com/QQuik/quik_proximity_marketing/issues/413)) ([519ca2b](https://github.com/QQuik/quik_proximity_marketing/commit/519ca2b885f0e6d28005a6b904fb6925ec0de7db))

## [1.1.0-development.57](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.56...v1.1.0-development.57) (2025-09-08)

### 🐛 Bug Fixes

- update short_url to use environment variable for base URL ([ac0dfe2](https://github.com/QQuik/quik_proximity_marketing/commit/ac0dfe220b3825d17775ff704069d39a53202eaf))

### Chore

- remove debug logging statements from touchpoint migration ([c0a815e](https://github.com/QQuik/quik_proximity_marketing/commit/c0a815e2fe29e5f2248d123aaf98e88ad36be97c))

## [1.1.0-development.56](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.55...v1.1.0-development.56) (2025-09-08)

### ✨ Features

- add token refresh handling and QR code URL tracking parameter ([4b3148d](https://github.com/QQuik/quik_proximity_marketing/commit/4b3148d4a2709d50bd0aa5a29e604eee0343d223))

## [1.1.0-development.55](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.54...v1.1.0-development.55) (2025-09-08)

### 🐛 Bug Fixes

- domain not have https ([e6e973e](https://github.com/QQuik/quik_proximity_marketing/commit/e6e973e29ff3a757830a3ec5062a0c9c22626dc1))

## [1.1.0-development.54](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.53...v1.1.0-development.54) (2025-09-08)

### 🐛 Bug Fixes

- handle null createdTpId in rollback and improve type safety ([2c15143](https://github.com/QQuik/quik_proximity_marketing/commit/2c15143a3c35927f816fead761db75105c7bab92))

## [1.1.0-development.53](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.52...v1.1.0-development.53) (2025-09-06)

### ✨ Features

- enhance error handling in touch point creation with rollback and localized messages ([ab889ac](https://github.com/QQuik/quik_proximity_marketing/commit/ab889ac9a397392327991997d2cfb7ebae04e314))

## [1.1.0-development.52](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.51...v1.1.0-development.52) (2025-09-06)

### ✨ Features

- enhance CreateDomainForm and API response structure with improved error handling and new types ([b8e13a5](https://github.com/QQuik/quik_proximity_marketing/commit/b8e13a51f836fcf7f34dea0c9dfdfb190ebe0d9b))

### Chore

- update encrypted development environment variables ([80d5457](https://github.com/QQuik/quik_proximity_marketing/commit/80d545799196e3f2e1d159e3baaeded115d125d1))

## [1.1.0-development.51](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.50...v1.1.0-development.51) (2025-09-05)

### ✨ Features

- add locale support for AI-generated slugs and improve error handling ([#410](https://github.com/QQuik/quik_proximity_marketing/issues/410)) ([bf592b0](https://github.com/QQuik/quik_proximity_marketing/commit/bf592b0cc95361adc81248d8564f12c2eea0d5ca))

### 🛠 Updates

- ai UI slug with design ([#408](https://github.com/QQuik/quik_proximity_marketing/issues/408)) ([8f4a6ff](https://github.com/QQuik/quik_proximity_marketing/commit/8f4a6ff056cb72c491f9608f4b1a89586361d55c))

### ♻️ Code Refactoring

- improve file upload validation and error handling for CSV imports ([#409](https://github.com/QQuik/quik_proximity_marketing/issues/409)) ([692f058](https://github.com/QQuik/quik_proximity_marketing/commit/692f05829fd2d54481053ead07ee7a0182f3cff3))

## [1.1.0-development.50](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.49...v1.1.0-development.50) (2025-09-05)

### 🐛 Bug Fixes

- adding type button to ai optimize btn ([#407](https://github.com/QQuik/quik_proximity_marketing/issues/407)) ([8ee1ab7](https://github.com/QQuik/quik_proximity_marketing/commit/8ee1ab72cb4993aac9beea0bef4ee19a9ff8588a))

### 🛠 Updates

- import file validate data ([#406](https://github.com/QQuik/quik_proximity_marketing/issues/406)) ([1eab054](https://github.com/QQuik/quik_proximity_marketing/commit/1eab0542ca295b978e16b9393453288809bc64b0))
- slug generation prompt ([#405](https://github.com/QQuik/quik_proximity_marketing/issues/405)) ([023c55b](https://github.com/QQuik/quik_proximity_marketing/commit/023c55b3f40812beda8cde054d6a71affd07ab7e))

## [1.1.0-development.49](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.48...v1.1.0-development.49) (2025-09-04)

### ✨ Features

- add ai generate slug components ([8e09ba4](https://github.com/QQuik/quik_proximity_marketing/commit/8e09ba41141039e494f4c2a3a42f6a5678e656c9))

## [1.1.0-development.48](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.47...v1.1.0-development.48) (2025-09-04)

### ✨ Features

- implement AI provider key rotation and caching system for slug generation ([4fbb948](https://github.com/QQuik/quik_proximity_marketing/commit/4fbb948a86fb2a369e7c661ce3f98cb42938253a))
- implement AI-powered slug generation with LiteLLM and Firecrawler integration ([cfd6035](https://github.com/QQuik/quik_proximity_marketing/commit/cfd603557c501316c54509a00b21b7868c744712))

### 🛠 Updates

- filter for advanced analytic ([#393](https://github.com/QQuik/quik_proximity_marketing/issues/393)) ([7528be5](https://github.com/QQuik/quik_proximity_marketing/commit/7528be5fe9a026b1b4a51d654dff9a05f6198cc1))
- missing code from cherry pick for linechart and heatmap ([#395](https://github.com/QQuik/quik_proximity_marketing/issues/395)) ([5cf5558](https://github.com/QQuik/quik_proximity_marketing/commit/5cf5558df5569df98752367cabb768cb536ae045))
- setup AI Optimize Slug UI version 1.0, still missing AI Recom… ([#396](https://github.com/QQuik/quik_proximity_marketing/issues/396)) ([a995765](https://github.com/QQuik/quik_proximity_marketing/commit/a995765bd4662ae2a762a600bfe029ecb09dfa1e))

### ♻️ Code Refactoring

- improve error handling and type safety in premium grant callback ([f86c134](https://github.com/QQuik/quik_proximity_marketing/commit/f86c1341f7aa184b0e1ce4ca94209189c47f44b4))

### Chore

- add encrypted development environment variables ([2bbf745](https://github.com/QQuik/quik_proximity_marketing/commit/2bbf7450d096cdb9f590a322de4f1724e9cdad2a))
- just release on main ([b694a32](https://github.com/QQuik/quik_proximity_marketing/commit/b694a323ac1395b3340802018fe2a6018b28b737))
- update error message and remove endOfLine config in prettier ([f6cd34a](https://github.com/QQuik/quik_proximity_marketing/commit/f6cd34a5af907faa5545ddb56ef1e2328c321b57))

### 🎨 Code Style

- remove deployment dependency from semantic release job ([e09766f](https://github.com/QQuik/quik_proximity_marketing/commit/e09766feb9750e244eb73e1193d5846c03542257))

## [1.1.0-development.47](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.46...v1.1.0-development.47) (2025-08-28)

### ✨ Features

- limit anonymous users to 1 total touch point instead of 3 per day ([96ed895](https://github.com/QQuik/quik_proximity_marketing/commit/96ed895a73287a5db752c54d794cb8e89cca9afa))

## [1.1.0-development.46](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.45...v1.1.0-development.46) (2025-08-28)

### 🐛 Bug Fixes

- skip domain-based cookie deletion in development environment ([9ade6e7](https://github.com/QQuik/quik_proximity_marketing/commit/9ade6e78debe184cd070c712cccdb4ce7db7287b))

## [1.1.0-development.45](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.44...v1.1.0-development.45) (2025-08-28)

### 🐛 Bug Fixes

- ensure cookies are always deleted regardless of domain during logout ([1559620](https://github.com/QQuik/quik_proximity_marketing/commit/155962076fdefeb87a60cc0a645163570aeab831))

## [1.1.0-development.44](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.43...v1.1.0-development.44) (2025-08-27)

### 🐛 Bug Fixes

- update to using app error and check empty in advanced analytic ([#386](https://github.com/QQuik/quik_proximity_marketing/issues/386)) ([1dcf292](https://github.com/QQuik/quik_proximity_marketing/commit/1dcf2926f35abead1f14723d2a2ad7be203d825e))

## [1.1.0-development.43](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.42...v1.1.0-development.43) (2025-08-27)

### 🐛 Bug Fixes

- profile service ([#390](https://github.com/QQuik/quik_proximity_marketing/issues/390)) ([8c4bcba](https://github.com/QQuik/quik_proximity_marketing/commit/8c4bcba273ea35c8c966696b70efc57d52327520))

## [1.1.0-development.42](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.41...v1.1.0-development.42) (2025-08-27)

### ✨ Features

- add domain-based cookie handling for cross-subdomain authentication ([38550b0](https://github.com/QQuik/quik_proximity_marketing/commit/38550b004d0d947a6d06824b0edb75a73ab43fc6))

### 🐛 Bug Fixes

- handle cookie domain for production environment in auth routes ([f7b1aaa](https://github.com/QQuik/quik_proximity_marketing/commit/f7b1aaa85a7cb57960395a290679b5ae6fee6aed))

## [1.1.0-development.41](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.40...v1.1.0-development.41) (2025-08-27)

### ✨ Features

- add expiration dates and SameSite policy to auth cookies ([92421db](https://github.com/QQuik/quik_proximity_marketing/commit/92421dbc392fd0b624ff4d8bff8a3660b4d48534))
- implement auth refresh and logout endpoints with cookie management ([2947847](https://github.com/QQuik/quik_proximity_marketing/commit/294784782360d28fb4a7ca14c6f3c01bfeda7a58))

### ♻️ Code Refactoring

- simplify touch point creation and update Redis password handling ([64544db](https://github.com/QQuik/quik_proximity_marketing/commit/64544db5beed8df67baa00a03dea7dda707ea7a3))

## [1.1.0-development.40](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.39...v1.1.0-development.40) (2025-08-27)

### ✨ Features

- add OPTIONS handler with CORS support for touch-point endpoints ([5e23d38](https://github.com/QQuik/quik_proximity_marketing/commit/5e23d3801e5c9a73f5dff64d4aa1b389bcf6bad7))

## [1.1.0-development.39](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.38...v1.1.0-development.39) (2025-08-27)

### 🐛 Bug Fixes

- using session to get user in update Profile and remove console… ([#389](https://github.com/QQuik/quik_proximity_marketing/issues/389)) ([e0b20c2](https://github.com/QQuik/quik_proximity_marketing/commit/e0b20c26da9438bdf6784b21462d7f002440c502))

### ♻️ Code Refactoring

- implement CORS middleware with enhanced security and caching headers ([9ffa50f](https://github.com/QQuik/quik_proximity_marketing/commit/9ffa50f0c652e6236ccff2174e5f17d2df674b1e))

## [1.1.0-development.38](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.37...v1.1.0-development.38) (2025-08-27)

### ✨ Features

- implement CORS middleware with domain allowlist for public API endpoints ([55da9f6](https://github.com/QQuik/quik_proximity_marketing/commit/55da9f66e4aba8f56b3f216acb91f91e614217cf))

## [1.1.0-development.37](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.36...v1.1.0-development.37) (2025-08-27)

### 🐛 Bug Fixes

- update SameSite cookie attribute from None to Lax for auth tokens ([09edd47](https://github.com/QQuik/quik_proximity_marketing/commit/09edd4756335045ad09096c30f7ab60d887d9ae3))

## [1.1.0-development.36](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.35...v1.1.0-development.36) (2025-08-27)

### ✨ Features

- add bootstrap client ([#388](https://github.com/QQuik/quik_proximity_marketing/issues/388)) ([3e247fc](https://github.com/QQuik/quik_proximity_marketing/commit/3e247fc1a84a37db163e39b1bdca728ad0b11fa5))

### Chore

- update env ([89266f6](https://github.com/QQuik/quik_proximity_marketing/commit/89266f669be74fa640ff3146d9849b156e118f59))

## [1.1.0-development.35](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.34...v1.1.0-development.35) (2025-08-25)

### ✨ Features

- add i18n support for error messages with default fallbacks ([5249af9](https://github.com/QQuik/quik_proximity_marketing/commit/5249af9c180276f8d68620add84ce8c856db9576))

## [1.1.0-development.34](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.33...v1.1.0-development.34) (2025-08-23)

### ✨ Features

- add 3 links per day limit and auto-delete after 7 days for anonymous touch points ([4b2fade](https://github.com/QQuik/quik_proximity_marketing/commit/4b2fade6b2617f9048c2c287d9e0da8e9bbf3032))

### Chore

- update minor detail ([#384](https://github.com/QQuik/quik_proximity_marketing/issues/384)) ([82a9646](https://github.com/QQuik/quik_proximity_marketing/commit/82a96469ba662990510632e32725231eaab3bc58))
- update translation and return text ([#385](https://github.com/QQuik/quik_proximity_marketing/issues/385)) ([31b0f04](https://github.com/QQuik/quik_proximity_marketing/commit/31b0f0478988c14ccf8a8a3f656707791081fbef))

## [1.1.0-development.33](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.32...v1.1.0-development.33) (2025-08-23)

### ✨ Features

- add localized format plugin and simplify anon touch points response structure ([a2a9107](https://github.com/QQuik/quik_proximity_marketing/commit/a2a9107ca1301efc84e2191bf48375b5c2bef97d))

### 🛠 Updates

- adding zod translation ([#382](https://github.com/QQuik/quik_proximity_marketing/issues/382)) ([9d3caab](https://github.com/QQuik/quik_proximity_marketing/commit/9d3caabb43c12c82796f35a72fe9e1a58c34ccf8))

### Chore

- update translation for UX ([#383](https://github.com/QQuik/quik_proximity_marketing/issues/383)) ([73523f8](https://github.com/QQuik/quik_proximity_marketing/commit/73523f82cf6e2a708436c7ad812648211bdeced5))

## [1.1.0-development.32](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.31...v1.1.0-development.32) (2025-08-22)

### ✨ Features

- add i18n support for error messages in react-query error handler ([67e1bc5](https://github.com/QQuik/quik_proximity_marketing/commit/67e1bc515a996a02ea4fbe593fda7bfaec7d9bb5))

## [1.1.0-development.31](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.30...v1.1.0-development.31) (2025-08-22)

### 🐛 Bug Fixes

- empty response message ([1c21bc8](https://github.com/QQuik/quik_proximity_marketing/commit/1c21bc8962c0b57adcebb8d04ddb8305dd2efbfe))

### 🛠 Updates

- translation files ([#381](https://github.com/QQuik/quik_proximity_marketing/issues/381)) ([6c6c91b](https://github.com/QQuik/quik_proximity_marketing/commit/6c6c91b2f885358de46de17735c1dcecaf27f5ff))

## [1.1.0-development.30](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.29...v1.1.0-development.30) (2025-08-22)

### ✨ Features

- implement i18n on api & zod ([#380](https://github.com/QQuik/quik_proximity_marketing/issues/380)) ([c6a47e8](https://github.com/QQuik/quik_proximity_marketing/commit/c6a47e8debc39c3ffb550c880063ae175af71d69))

## [1.1.0-development.29](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.28...v1.1.0-development.29) (2025-08-21)

### 🐛 Bug Fixes

- update dependabot config to use npm instead of yarn package ecosystem ([62bc715](https://github.com/QQuik/quik_proximity_marketing/commit/62bc715b3f2ea7034dba21e86d9e699a8df9f7c8))

### Chore

- add dependabot configuration for daily yarn package updates ([c958da8](https://github.com/QQuik/quik_proximity_marketing/commit/c958da8ce0b0daae049d9de5c4b597648efd5e8d))
- use dayjs shared lib ([#378](https://github.com/QQuik/quik_proximity_marketing/issues/378)) ([348a284](https://github.com/QQuik/quik_proximity_marketing/commit/348a28466893b0553034fd08bb42c70f5807b8da))

## [1.1.0-development.28](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.27...v1.1.0-development.28) (2025-08-21)

### ✨ Features

- implement server-side timezone and locale handling with dayjs integration ([35841cf](https://github.com/QQuik/quik_proximity_marketing/commit/35841cff7947172880f83327032f2ee49fb34eb5))

### Chore

- update using hook usedayjs topperformance tp text ([#377](https://github.com/QQuik/quik_proximity_marketing/issues/377)) ([91fce81](https://github.com/QQuik/quik_proximity_marketing/commit/91fce81eab6543a983e6a5ea5cc00dcdaaa97274))

## [1.1.0-development.27](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.26...v1.1.0-development.27) (2025-08-21)

### ✨ Features

- implement locale and timezone management with dayjs integration ([5843c0f](https://github.com/QQuik/quik_proximity_marketing/commit/5843c0f4b7c220b81b0e5ea78c42b856dbde8541))

### Chore

- temporarily disable CombinedFilter and CurrentFilters components in analytics view ([b7bc9f1](https://github.com/QQuik/quik_proximity_marketing/commit/b7bc9f1b8ad14cae873428f5fd676676d4716230))

## [1.1.0-development.26](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.25...v1.1.0-development.26) (2025-08-20)

### ✨ Features

- limit active time range display to 3 hours in channel analysis ([05ff693](https://github.com/QQuik/quik_proximity_marketing/commit/05ff6935e69fad2313a72d067228396442fed061))

### Chore

- update translation files ([#374](https://github.com/QQuik/quik_proximity_marketing/issues/374)) ([03a2d9b](https://github.com/QQuik/quik_proximity_marketing/commit/03a2d9b11c7b8e1af12d15a7543b003a4c42b996))

### 🎨 Code Style

- fix chart pie in analytic page ([14b7599](https://github.com/QQuik/quik_proximity_marketing/commit/14b7599bd11b5aff591662b2a1add2f0263d6cea))

## [1.1.0-development.25](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.24...v1.1.0-development.25) (2025-08-20)

### ✨ Features

- implement anonymous touch points API with repository and service layers ([6bbb254](https://github.com/QQuik/quik_proximity_marketing/commit/6bbb254cd592e86959f8aad808dd5002e3f14624))

## [1.1.0-development.24](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.23...v1.1.0-development.24) (2025-08-20)

### ✨ Features

- realtime data tab ([#373](https://github.com/QQuik/quik_proximity_marketing/issues/373)) ([3f8d16f](https://github.com/QQuik/quik_proximity_marketing/commit/3f8d16fc680f6d4adc6122732af35413be89f77a))

## [1.1.0-development.23](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.22...v1.1.0-development.23) (2025-08-18)

### ✨ Features

- implement anonymous touch points API with middleware and schema validation ([85f0217](https://github.com/QQuik/quik_proximity_marketing/commit/85f0217dd263a00bab558470ac1fb222afaf833c))

### Chore

- add log into dashboard route ([a537cd4](https://github.com/QQuik/quik_proximity_marketing/commit/a537cd4960d0551b6884a7571e2ca934807d0c34))
- add log into dashboard route ([719585b](https://github.com/QQuik/quik_proximity_marketing/commit/719585b6220eeabf8aecd479a3d51eefa614a516))
- add log into dashboard route ([94d3466](https://github.com/QQuik/quik_proximity_marketing/commit/94d3466b3b1d4b02b0c9f32232c839fad732584f))

## [1.1.0-development.22](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.21...v1.1.0-development.22) (2025-08-15)

### ✨ Features

- implement advanced filter UI with tag and touchpoint selection ([128412d](https://github.com/QQuik/quik_proximity_marketing/commit/128412ddfca1a2187a477b3ea9678e54efaa8ec3))

### 🛠 Updates

- Adding placholder for empty data chart ([#372](https://github.com/QQuik/quik_proximity_marketing/issues/372)) ([9834143](https://github.com/QQuik/quik_proximity_marketing/commit/983414350dd696c641e3d5d0e4613fdb56f92f3c))

## [1.1.0-development.21](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.20...v1.1.0-development.21) (2025-08-15)

### 🐛 Bug Fixes

- error when null data ([#371](https://github.com/QQuik/quik_proximity_marketing/issues/371)) ([8a3e97d](https://github.com/QQuik/quik_proximity_marketing/commit/8a3e97d1e7f5b3ce908c742abf9d70bc698ac91b))

## [1.1.0-development.20](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.19...v1.1.0-development.20) (2025-08-15)

### 🐛 Bug Fixes

- fix error when null data fetching ([#370](https://github.com/QQuik/quik_proximity_marketing/issues/370)) ([2ef0f8b](https://github.com/QQuik/quik_proximity_marketing/commit/2ef0f8b66716fa8c7f911780db66840861f0b35e))

## [1.1.0-development.19](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.18...v1.1.0-development.19) (2025-08-15)

### 🐛 Bug Fixes

- hot fix table rows ([ddc4500](https://github.com/QQuik/quik_proximity_marketing/commit/ddc4500a799a68adc5f592202d4fda06fa55c085))

### 🎨 Code Style

- update style for not misunderstanding ([4587567](https://github.com/QQuik/quik_proximity_marketing/commit/45875674ddfb80ba28b7b572a87f8229af97895b))

## [1.1.0-development.18](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.17...v1.1.0-development.18) (2025-08-15)

### ✨ Features

- move custom domains to dedicated page and improve filter UI ([43aa0a3](https://github.com/QQuik/quik_proximity_marketing/commit/43aa0a317879bfb688e9744c37870959a482032a))

### 🐛 Bug Fixes

- build error by correct null check ([#369](https://github.com/QQuik/quik_proximity_marketing/issues/369)) ([5014422](https://github.com/QQuik/quik_proximity_marketing/commit/5014422e1d9f00fa06b99f3b4a4686a13897249e))

### 🛠 Updates

- adding null check for tabs ([#368](https://github.com/QQuik/quik_proximity_marketing/issues/368)) ([d894cd2](https://github.com/QQuik/quik_proximity_marketing/commit/d894cd265a3b5d1a2cb20f81e00b39ba661e9147))

## [1.1.0-development.17](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.16...v1.1.0-development.17) (2025-08-15)

### ✨ Features

- implement advanced analytics filtering with tags and touchpoints selection ([3cd7105](https://github.com/QQuik/quik_proximity_marketing/commit/3cd7105411a5bd0acaf6c9738376239bbadadbe8))

### 🛠 Updates

- adding null check for some maps and remove Empty section, change it to null instead for reduce misunderstanding, apply tabs for Audience ([#366](https://github.com/QQuik/quik_proximity_marketing/issues/366)) ([cb0bf5f](https://github.com/QQuik/quik_proximity_marketing/commit/cb0bf5f84dad03fb24e7733dc1eb319817d8f162))

### Chore

- change text Analytic By Tag -> Basic Analytics ([b5b3ff3](https://github.com/QQuik/quik_proximity_marketing/commit/b5b3ff386282152fb7e982668358aacb76a656a9))

### 🎨 Code Style

- make advanced analytic's last 2 tabs not clickable ([f9e2cdb](https://github.com/QQuik/quik_proximity_marketing/commit/f9e2cdb00d0120a4a583e106d27e9911ad90a7d0))

## [1.1.0-development.16](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.15...v1.1.0-development.16) (2025-08-14)

### 🐛 Bug Fixes

- heatmap wrong color ([59840c7](https://github.com/QQuik/quik_proximity_marketing/commit/59840c718f788f354f21562f2548f27e20f3d655))

### 🎨 Code Style

- add skeleton for smooth ([f3184b0](https://github.com/QQuik/quik_proximity_marketing/commit/f3184b05e51d9d372a14d3b21f4c7ad9965d77a9))

## [1.1.0-development.15](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.14...v1.1.0-development.15) (2025-08-14)

### ✨ Features

- add behavior tabs with api ([#365](https://github.com/QQuik/quik_proximity_marketing/issues/365)) ([93600ec](https://github.com/QQuik/quik_proximity_marketing/commit/93600ec7fb90c0ea76834ce6796223ad648ecf9c))

### Chore

- fix text analytic visitors -> total ([32da4c6](https://github.com/QQuik/quik_proximity_marketing/commit/32da4c6af9bede8dfa4d4bfb3c5f6e9aa82318bd))
- update readme for project structure ([98d2f57](https://github.com/QQuik/quik_proximity_marketing/commit/98d2f5701dbf583895a8a101869838c30b84bf09))

## [1.1.0-development.14](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.13...v1.1.0-development.14) (2025-08-14)

### 🐛 Bug Fixes

- suspense on acquisitions tab ([62df083](https://github.com/QQuik/quik_proximity_marketing/commit/62df08367024bc69cefd1d94304753afd30a6a35))

## [1.1.0-development.13](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.12...v1.1.0-development.13) (2025-08-14)

### ✨ Features

- add behavior tabs with mockdata [#364](https://github.com/QQuik/quik_proximity_marketing/issues/364) ([caaf378](https://github.com/QQuik/quik_proximity_marketing/commit/caaf378e40672365d57c71bc76fd2a33beae35bb))

### 🛠 Updates

- update skeleton for lazy load components ([dec8173](https://github.com/QQuik/quik_proximity_marketing/commit/dec817393885afe3d1628f38d9580f4ee5df8b01))

### ♻️ Code Refactoring

- components into features ([#362](https://github.com/QQuik/quik_proximity_marketing/issues/362)) ([17b5798](https://github.com/QQuik/quik_proximity_marketing/commit/17b57986fac8a48228e2e226af98e8eb5252c695))
- restructure codebase based features ([#363](https://github.com/QQuik/quik_proximity_marketing/issues/363)) ([849cbc0](https://github.com/QQuik/quik_proximity_marketing/commit/849cbc06703e9d633714ca519893e5bd21261dad))

## [1.1.0-development.12](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.11...v1.1.0-development.12) (2025-08-13)

### 🐛 Bug Fixes

- heatmap hover ([f1cbdb2](https://github.com/QQuik/quik_proximity_marketing/commit/f1cbdb2c1ed163037731d9071f623c2ac3bb661a))

## [1.1.0-development.11](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.10...v1.1.0-development.11) (2025-08-13)

### ✨ Features

- implement activity line chart with daily trend visualization and analytics ([#360](https://github.com/QQuik/quik_proximity_marketing/issues/360)) ([7535f4c](https://github.com/QQuik/quik_proximity_marketing/commit/7535f4c239b457ebe925859393bbe50ab303ae93))

### 🛠 Updates

- add api call for acquistion ([#361](https://github.com/QQuik/quik_proximity_marketing/issues/361)) ([91adbfc](https://github.com/QQuik/quik_proximity_marketing/commit/91adbfcbad43dc55de85ea3fa35a54c2350afcea))
- upgrade chart version ([57eaa2d](https://github.com/QQuik/quik_proximity_marketing/commit/57eaa2d17bae3fdcca8b3b55c7c2969bd52d39c7))

## [1.1.0-development.10](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.9...v1.1.0-development.10) (2025-08-13)

### ✨ Features

- update ui version 1.0 for acquistions and hide the attribute override… ([#358](https://github.com/QQuik/quik_proximity_marketing/issues/358)) ([dc0ab5a](https://github.com/QQuik/quik_proximity_marketing/commit/dc0ab5aa43dd2ab483d99c9ffb3515988b02687a))

## [1.1.0-development.9](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.8...v1.1.0-development.9) (2025-08-13)

### ✨ Features

- add lazy load into advanced analytic overview page ([26ee8ba](https://github.com/QQuik/quik_proximity_marketing/commit/26ee8ba48b3dc42c6b04a36f1ec9cd12ea539956))

## [1.1.0-development.8](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.7...v1.1.0-development.8) (2025-08-12)

### 🐛 Bug Fixes

- mapping country not work ([88ed73f](https://github.com/QQuik/quik_proximity_marketing/commit/88ed73ff9e2ae6659bc1ff28f85cdb5711fb1ac4))

## [1.1.0-development.7](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.6...v1.1.0-development.7) (2025-08-12)

### ✨ Features

- add real api into advanced analytic ([#359](https://github.com/QQuik/quik_proximity_marketing/issues/359)) ([1324db1](https://github.com/QQuik/quik_proximity_marketing/commit/1324db175155458d5318b07fe829226ae49fac11))

### 🐛 Bug Fixes

- typescript error ([abec86b](https://github.com/QQuik/quik_proximity_marketing/commit/abec86b8eb6d38108b7d92c4ed29f8de487b6d59))

### Chore

- restructure some file/folder ([#357](https://github.com/QQuik/quik_proximity_marketing/issues/357)) ([348ef07](https://github.com/QQuik/quik_proximity_marketing/commit/348ef07e6c98ee788953a0834d652798123c1a9d))

## [1.1.0-development.6](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.5...v1.1.0-development.6) (2025-08-11)

### ✨ Features

- modify code & add hook & api for advanced analytics ([#355](https://github.com/QQuik/quik_proximity_marketing/issues/355)) ([e3f639c](https://github.com/QQuik/quik_proximity_marketing/commit/e3f639c36a90ac0d406cc45acc92fb6c29b35915))

### 🛠 Updates

- advanced analytic UI v0.2 ([#353](https://github.com/QQuik/quik_proximity_marketing/issues/353)) ([687c942](https://github.com/QQuik/quik_proximity_marketing/commit/687c9421088fa9a0af7393b0db2b72369a96191e))

### Chore

- update dev env encoded ([e9096c3](https://github.com/QQuik/quik_proximity_marketing/commit/e9096c33ff3fb8d7ac1d709ffb7c57b3747fa84e))

## [1.1.0-development.5](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.4...v1.1.0-development.5) (2025-08-11)

### 🐛 Bug Fixes

- qr spam update in tp update page ([326d38a](https://github.com/QQuik/quik_proximity_marketing/commit/326d38ae54b9534664e9e554bbec824317581fe6))

### 🛠 Updates

- advanced analytic UI v0.1 ([#352](https://github.com/QQuik/quik_proximity_marketing/issues/352)) ([17d935f](https://github.com/QQuik/quik_proximity_marketing/commit/17d935f214f37653c025932630ec9446222428ea))

### Chore

- update prettier ([eda7999](https://github.com/QQuik/quik_proximity_marketing/commit/eda7999709c526540326ddf5d65b6c1e5e1fbfc3))

## [1.1.0-development.4](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.3...v1.1.0-development.4) (2025-08-08)

### ✨ Features

- add advanced analytic with mockup data ([#351](https://github.com/QQuik/quik_proximity_marketing/issues/351)) ([01ea0ec](https://github.com/QQuik/quik_proximity_marketing/commit/01ea0ececcb250ee0a0cf4a48cc0837b573d439e))

### ♻️ Code Refactoring

- touch point module into core ([#350](https://github.com/QQuik/quik_proximity_marketing/issues/350)) ([aaed4a0](https://github.com/QQuik/quik_proximity_marketing/commit/aaed4a01aa91ed0b4d470c1e18aca6c190835267))

## [1.1.0-development.3](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.2...v1.1.0-development.3) (2025-08-07)

### 🐛 Bug Fixes

- analytic advanced & some error ([baba42b](https://github.com/QQuik/quik_proximity_marketing/commit/baba42b1600f6dc2c05897808875df8aafbde1fd))

## [1.1.0-development.2](https://github.com/QQuik/quik_proximity_marketing/compare/v1.1.0-development.1...v1.1.0-development.2) (2025-08-07)

### ✨ Features

- implement timezone handling across analytics and dashboard components ([e58fbbd](https://github.com/QQuik/quik_proximity_marketing/commit/e58fbbdaa587ab4d63ea06f3f7eb209739ac0593))

## [1.1.0-development.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2-development.5...v1.1.0-development.1) (2025-08-07)

### ✨ Features

- add timezone ([#348](https://github.com/QQuik/quik_proximity_marketing/issues/348)) ([b2112f3](https://github.com/QQuik/quik_proximity_marketing/commit/b2112f3ae964103e98d3eccece0eb1d3a6746328))

### 🛠 Updates

- change li2con from png to svg ([#340](https://github.com/QQuik/quik_proximity_marketing/issues/340)) ([0349e3e](https://github.com/QQuik/quik_proximity_marketing/commit/0349e3ec84dcc40e268ee74d44f7493860830c2e))
- change text top performing and rename file ([#342](https://github.com/QQuik/quik_proximity_marketing/issues/342)) ([2a01c43](https://github.com/QQuik/quik_proximity_marketing/commit/2a01c4393bc010a80170f696c3110b1abde3d774))
- display one month selection for mobile calendar ([#341](https://github.com/QQuik/quik_proximity_marketing/issues/341)) ([ba22f30](https://github.com/QQuik/quik_proximity_marketing/commit/ba22f30d46cc0a9f1bf4831937c3f7f2f599454c))

### ♻️ Code Refactoring

- move assets into more structural place ([#347](https://github.com/QQuik/quik_proximity_marketing/issues/347)) ([2c3fac3](https://github.com/QQuik/quik_proximity_marketing/commit/2c3fac34e6703c1268d40784eaf90c3f7d547274))
- move logic tp delete & tp create into core ([fbeb3f7](https://github.com/QQuik/quik_proximity_marketing/commit/fbeb3f79fa165687f60df9787400f0c597698e88))
- project structure ([#343](https://github.com/QQuik/quik_proximity_marketing/issues/343)) ([d4d601d](https://github.com/QQuik/quik_proximity_marketing/commit/d4d601dd5dfaafae57c3dfb4805d755ff99aaf47))
- repo service profile userplan ([#349](https://github.com/QQuik/quik_proximity_marketing/issues/349)) ([6b49180](https://github.com/QQuik/quik_proximity_marketing/commit/6b491805a020ca40a65d01293fed9aca0564c9e7))
- touch point create api ([108549d](https://github.com/QQuik/quik_proximity_marketing/commit/108549dd01ad3ae14f88fb04085a1b703e0a05b8))

### Chore

- add sourcemap to debug ([65434f9](https://github.com/QQuik/quik_proximity_marketing/commit/65434f9a9e1be50a8cb0e1424dde13f2c73c23fb))

### 🎨 Code Style

- adding style inherit to override default style of sonner ([#345](https://github.com/QQuik/quik_proximity_marketing/issues/345)) ([309912d](https://github.com/QQuik/quik_proximity_marketing/commit/309912dc50d1d63aba35dd2550e691651dd60f6b))

## [1.0.2-development.5](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2-development.4...v1.0.2-development.5) (2025-08-05)

### 🐛 Bug Fixes

- update mail queue ([4f2b81c](https://github.com/QQuik/quik_proximity_marketing/commit/4f2b81c1c2b900fdc5a1e2fa1bc7d1304ceeeaa7))

## [1.0.2-development.4](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2-development.3...v1.0.2-development.4) (2025-08-05)

### 🐛 Bug Fixes

- tags error on macos ([403fab6](https://github.com/QQuik/quik_proximity_marketing/commit/403fab61462f8b230aa7dd373b7c186ac7f9c1a5))

### Chore

- remove sourcemap ([dc34fb9](https://github.com/QQuik/quik_proximity_marketing/commit/dc34fb9df7486b2143f30f17ad4c1e9290e6933c))

## [1.0.2-development.3](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2-development.2...v1.0.2-development.3) (2025-08-04)

### 🐛 Bug Fixes

- tag errors ([603b7e5](https://github.com/QQuik/quik_proximity_marketing/commit/603b7e5ecd3f93ef0b42a12219677c2ca92939c4))

### 🛠 Updates

- remove unused import and add maw-width for right image in meta tags ([#337](https://github.com/QQuik/quik_proximity_marketing/issues/337)) ([a8d684c](https://github.com/QQuik/quik_proximity_marketing/commit/a8d684ce0f34865acdab03250b298702eba466fe))

### Chore

- remove sentry to show source map ([607bdbd](https://github.com/QQuik/quik_proximity_marketing/commit/607bdbd3d3a1204e87c48960ab5d4561db52d45f))
- update cicd ([b89a6df](https://github.com/QQuik/quik_proximity_marketing/commit/b89a6df6597916cb5f6b4919aa693060b6974ee9))
- update lockable section groupcss name ([4a6d86c](https://github.com/QQuik/quik_proximity_marketing/commit/4a6d86c2ba6b6b310efc9fc344e03b1546bbd9c3))

### 🎨 Code Style

- fix color for toast description on darktheme ([dcaf507](https://github.com/QQuik/quik_proximity_marketing/commit/dcaf5078efbf8e4df1015d12fe2c1b14cf3d1b4a))

## [1.0.2-development.2](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.2-development.1...v1.0.2-development.2) (2025-08-04)

### 🐛 Bug Fixes

- 404 button ([#336](https://github.com/QQuik/quik_proximity_marketing/issues/336)) ([2989283](https://github.com/QQuik/quik_proximity_marketing/commit/29892831200c0bde453edf30d78edd03f66a96e3))
- workflow ([e21d618](https://github.com/QQuik/quik_proximity_marketing/commit/e21d6180a98b5a4493efb0613aadd86108cff7b0))

### 🛠 Updates

- change logic of validate desination ([dbf3e00](https://github.com/QQuik/quik_proximity_marketing/commit/dbf3e006545fcdd541718b6be4006edf7ce6e04b))

### Chore

- update releaserc json ([92568df](https://github.com/QQuik/quik_proximity_marketing/commit/92568df4f866a9da9701cda7c727eeed975cd621))

## [1.0.2-development.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.1...v1.0.2-development.1) (2025-08-04)

### Bug Fixes

- fix cicd & releaserc ([2882c87](https://github.com/QQuik/quik_proximity_marketing/commit/2882c87342b4c7bf3ae0ca19427ea0dc8322006e))

## [1.0.1](https://github.com/QQuik/quik_proximity_marketing/compare/v1.0.0...v1.0.1) (2025-08-04)

### Bug Fixes

- type error ([4806593](https://github.com/QQuik/quik_proximity_marketing/commit/48065938e5ac63963d4d3fa529e06b7c54c0d0b6))

# 1.0.0 (2025-08-04)

### Bug Fixes

- 0.0.0.0 in redirect url ([27f786f](https://github.com/QQuik/quik_proximity_marketing/commit/27f786fe9b441d70728cb81e88b1b595d614bd32))
- active not make form dirty ([a3d716e](https://github.com/QQuik/quik_proximity_marketing/commit/a3d716ef6b1adfb08adf1860366c6412842a6a19))
- add cookie to i18n detection ([9702ee3](https://github.com/QQuik/quik_proximity_marketing/commit/9702ee3a94cabb745b50f8539cd0654587991cad))
- add expires time for supabase jwt ([fb3e39c](https://github.com/QQuik/quik_proximity_marketing/commit/fb3e39c2a6d66cfbbe9f8f442a7139a06b1ec063))
- add https protocol to custom domain in short link ([f5e4082](https://github.com/QQuik/quik_proximity_marketing/commit/f5e4082f2e3f638a68cbf0a9e6ecbeee469e1d76))
- add key prop to Card component to resolve React warning ([c19fe66](https://github.com/QQuik/quik_proximity_marketing/commit/c19fe6668e3347df8ac317d8c10f29acde4dc3fc))
- add plan limit & lockable section ([6d09513](https://github.com/QQuik/quik_proximity_marketing/commit/6d095136c0ec703cfa27df64f88c492a80aa2ec8))
- allow empty utm id ([44025fa](https://github.com/QQuik/quik_proximity_marketing/commit/44025fa1a75ed8d59a17d0cd08c40aeae3025a63))
- animation ([011f829](https://github.com/QQuik/quik_proximity_marketing/commit/011f8291a89408768bd2718562bd75f8e4521c24))
- api called multi times when filter by created at ([383e82d](https://github.com/QQuik/quik_proximity_marketing/commit/383e82d7710798fd76371de3632a46fab21ebf33))
- audit vulnerability ([2f95a23](https://github.com/QQuik/quik_proximity_marketing/commit/2f95a238482099e55727d361e90e355c2034206f))
- banner ([26a134c](https://github.com/QQuik/quik_proximity_marketing/commit/26a134c305cda328a22c51dcdec13b24449458ab))
- bug that cant add domains ([f047c4c](https://github.com/QQuik/quik_proximity_marketing/commit/f047c4c15295502c94058017177337fd5c0d902d))
- build error ([250fd87](https://github.com/QQuik/quik_proximity_marketing/commit/250fd87d6bafad99e2b1b47a11cbb32d6c7ad72f))
- calculate time left for first time, not wait for first interval ([1d08f07](https://github.com/QQuik/quik_proximity_marketing/commit/1d08f07da08e6751f31df86956c7eefc616f1dfe))
- cancel zalo widget ([4239217](https://github.com/QQuik/quik_proximity_marketing/commit/4239217c7c5ffa9d94d46d4a598a807a4fff5734))
- change animation navbar ([1aac6c9](https://github.com/QQuik/quik_proximity_marketing/commit/1aac6c9722fff2c2bd973885af9efb5994907fc2))
- change due to comment ([c6e8d1a](https://github.com/QQuik/quik_proximity_marketing/commit/c6e8d1a36cab0bc2e35f7880c1677b3e2323b4d2))
- change gtm to ga ([a0c62cb](https://github.com/QQuik/quik_proximity_marketing/commit/a0c62cb06112e7ab6d4b183652fda9a692fe3e10))
- change supabase from public into private ([44bec4d](https://github.com/QQuik/quik_proximity_marketing/commit/44bec4d9f1ccf1a329d14211dade3bb4a33bee36))
- clear old file ([452d97c](https://github.com/QQuik/quik_proximity_marketing/commit/452d97c7df4941f658014845968cf48a1f5b06a5))
- clear some file ([e679299](https://github.com/QQuik/quik_proximity_marketing/commit/e679299b42017eb8a8a95e5d26449a5e4367eb2c))
- conflict ([8d9c4ad](https://github.com/QQuik/quik_proximity_marketing/commit/8d9c4adc594eaaf604bccfdf08e29a527b2de5c2))
- conflict ([c525ab1](https://github.com/QQuik/quik_proximity_marketing/commit/c525ab1c2cea53fc169e797b6dd289060fb201e2))
- conflict ([e7f0b90](https://github.com/QQuik/quik_proximity_marketing/commit/e7f0b905a2abc1a0017a67dd96ef2b1f45885a65))
- conflict ([2146389](https://github.com/QQuik/quik_proximity_marketing/commit/2146389e4971c4a0e549caae05071fb00596d762))
- conflict & add module integrations ([d2a147e](https://github.com/QQuik/quik_proximity_marketing/commit/d2a147ec98255c9deb71e3b0a5f4e2bd8a2e5af9))
- cookie i18n ([9e38d7b](https://github.com/QQuik/quik_proximity_marketing/commit/9e38d7b815f7f6ebd187b780f8f1bf523f193e03))
- cookie will work after this last fix ([ce926ce](https://github.com/QQuik/quik_proximity_marketing/commit/ce926cee2078c3ae6e4dc02c17b8ca9f9dd91aac))
- correct response schema ([9684d3f](https://github.com/QQuik/quik_proximity_marketing/commit/9684d3f0373603c3727af8e96d07501c775da432))
- created_at filter not work ([58c42ce](https://github.com/QQuik/quik_proximity_marketing/commit/58c42cefefa9ddde094599da51b97f754836d0e3))
- db-type ([338354a](https://github.com/QQuik/quik_proximity_marketing/commit/338354a106f0df0ed990cdee1c6a4fa1bb5f8fdd))
- deselect when change campaign in analytics page ([acfb11d](https://github.com/QQuik/quik_proximity_marketing/commit/acfb11d4337c3af89879e36d6d5dc5837f761f82))
- dialog break dom ([2bdd21a](https://github.com/QQuik/quik_proximity_marketing/commit/2bdd21aa234034cfd9ff500bb304d37a53bf74a5))
- docker compose ([0a36a09](https://github.com/QQuik/quik_proximity_marketing/commit/0a36a090e1187b58f378e835541a1e0cea7cc9f4))
- duplicate create access token ([e447040](https://github.com/QQuik/quik_proximity_marketing/commit/e4470401982e919515eb8c8f55a0923c6f1b7601))
- Enhance form validation and empty section component with better UI/UX ([4736533](https://github.com/QQuik/quik_proximity_marketing/commit/47365339b2f4cdad8ba12372c511637b64f0c4c5))
- env change to work on client side ([953dc4b](https://github.com/QQuik/quik_proximity_marketing/commit/953dc4bdcc18893a95b76f1a2575ecd01466039c))
- error that make free user can edit metatags ([850d0a8](https://github.com/QQuik/quik_proximity_marketing/commit/850d0a84e8ecfb96dacad6018f9289fe24eabff6))
- error ts ([583e937](https://github.com/QQuik/quik_proximity_marketing/commit/583e9376bfd511556a7e5eb0f5ca151ee3bea371))
- error when backing on proxify ([a52ac8f](https://github.com/QQuik/quik_proximity_marketing/commit/a52ac8f151a84c65d17629a61ffea3bbbd19e3e0))
- error" ([e22b124](https://github.com/QQuik/quik_proximity_marketing/commit/e22b1242acdb3a8d26b2ca8a4d7d87d922488403))
- error" ([c9f1f01](https://github.com/QQuik/quik_proximity_marketing/commit/c9f1f0102313db7f5270d38ce1cf2facac48f956))
- filter time error on tp analytics ([5f5319f](https://github.com/QQuik/quik_proximity_marketing/commit/5f5319fafb03ed55495d9cf6c828d1cc6b108938))
- fix banner ([5c474c1](https://github.com/QQuik/quik_proximity_marketing/commit/5c474c1995cf5f217f5e0ead2df57ed2c8fbac1f))
- fix bug mfa ([f273182](https://github.com/QQuik/quik_proximity_marketing/commit/f2731823600d31a0e1a26d3abdaba65f199b05ba))
- fix env ([0d2e41e](https://github.com/QQuik/quik_proximity_marketing/commit/0d2e41e9994f04cc11b63b0e2f6ab3276d1cf2be))
- fix key mail ([7a0e9e1](https://github.com/QQuik/quik_proximity_marketing/commit/7a0e9e1dd35a7f6edaabcdf14df98c41ada863ec))
- fix mail ([e18d9e2](https://github.com/QQuik/quik_proximity_marketing/commit/e18d9e2181e9fc095879d56a5ca627562e903457))
- fix mfa ([4cc228f](https://github.com/QQuik/quik_proximity_marketing/commit/4cc228f163f467ae29d8733965e00ee7eed676ac))
- fix utm tags ([78a7919](https://github.com/QQuik/quik_proximity_marketing/commit/78a79192f3bff84c4c5198a7b42735ffc85a1722))
- force push when delete touch point ([4e6ec24](https://github.com/QQuik/quik_proximity_marketing/commit/4e6ec24306f21821c30ffbd6edabf6156a7f2830))
- force push when delete touch point ([9a16ac6](https://github.com/QQuik/quik_proximity_marketing/commit/9a16ac639e8f4714e1a21edceeee1505a09b8663))
- form not change state when upload image ([751331a](https://github.com/QQuik/quik_proximity_marketing/commit/751331a1584dfdb4291d3e108d4ebfb84977c55a))
- format error ([366fb89](https://github.com/QQuik/quik_proximity_marketing/commit/366fb89b1944ac38f8918584326b65dab62984d8))
- GTM ID regex ([2ea0a3b](https://github.com/QQuik/quik_proximity_marketing/commit/2ea0a3b4b193013d5b4083343a1c46b586c36b4d))
- hot fixx ([5594f85](https://github.com/QQuik/quik_proximity_marketing/commit/5594f854bc973a37475f4603917e7fbb058f5bf0))
- i18n cookie ([3e3f0f2](https://github.com/QQuik/quik_proximity_marketing/commit/3e3f0f21e42fb4faa885abc78caaf88e0411c104))
- import error ([cc85aa3](https://github.com/QQuik/quik_proximity_marketing/commit/cc85aa32ffcb7d37e1f978435f1ae81bf52d26f9))
- import error ([fe66bc5](https://github.com/QQuik/quik_proximity_marketing/commit/fe66bc5d041d162a4d6041ddccdbc095742191e6))
- initial value error ([822e7fc](https://github.com/QQuik/quik_proximity_marketing/commit/822e7fc8400a83ed4f27ba10f2c75c8d348ca7be))
- layout ([5b641a3](https://github.com/QQuik/quik_proximity_marketing/commit/5b641a3eb41c2f7b45ce4a972b2a74617d7970a7))
- layout ([c9c6904](https://github.com/QQuik/quik_proximity_marketing/commit/c9c6904b482750c51dcf8721b7d93d8eeae52756))
- loading org not work ([f42c7b3](https://github.com/QQuik/quik_proximity_marketing/commit/f42c7b32ebd301c4141086a5e3d7fa07e4363e2f))
- loading state on i18n ([de41769](https://github.com/QQuik/quik_proximity_marketing/commit/de4176957f34fbf38a0110c2718ff0acdfd99e85))
- lockable section error ([8589b6d](https://github.com/QQuik/quik_proximity_marketing/commit/8589b6d11927b921c0786958a08cc5305ede2f10))
- make sidebar default show ([87b2f22](https://github.com/QQuik/quik_proximity_marketing/commit/87b2f22066eee9462043c6678623ea04d8e9dca8))
- make sidebar smooth when change from desktop to tablet ([b11da70](https://github.com/QQuik/quik_proximity_marketing/commit/b11da708783cd5a2f2d5205ab6b420ca2e397bcb))
- merge error ([b347f42](https://github.com/QQuik/quik_proximity_marketing/commit/b347f425299fea668779b7ffcdba789767919e1d))
- middleware error ([41398e2](https://github.com/QQuik/quik_proximity_marketing/commit/41398e2b69e48e590d00a8e21c7abf9c9d5a3645))
- middleware for public page ([b00ab17](https://github.com/QQuik/quik_proximity_marketing/commit/b00ab170f6036f4bccb51f60d0fe4aac98fff736))
- not refresh user plan after create org ([9801c71](https://github.com/QQuik/quik_proximity_marketing/commit/9801c71c4915bf8e78b59419680658b604298f3b))
- only send mail if result success is true ([fcf91a0](https://github.com/QQuik/quik_proximity_marketing/commit/fcf91a076e4c62a1500e0df031e2d703c37dcc83))
- parcel err ([25d6d5b](https://github.com/QQuik/quik_proximity_marketing/commit/25d6d5b8e42fd9bddbfbccd17e31386afaa273ce))
- parcelvoy ([3da54cf](https://github.com/QQuik/quik_proximity_marketing/commit/3da54cfc5f5c203101c34b772f3267fbd384bde2))
- parcelvoy docs url ([0c73df9](https://github.com/QQuik/quik_proximity_marketing/commit/0c73df9a82beb71c5fd57b2e469f73e2c8e64353))
- parcelvoy tp blocked ([b0d6f19](https://github.com/QQuik/quik_proximity_marketing/commit/b0d6f194fad745ecf90252cab704126e7da313f1))
- performance issue on i18n ([30d6830](https://github.com/QQuik/quik_proximity_marketing/commit/30d683075e72ae32098c6ed47e3223d417d3a228))
- plan cache not clear when create org ([6fd6fb8](https://github.com/QQuik/quik_proximity_marketing/commit/6fd6fb8d980b7acc683b466c7ed87f84820387ce))
- public files ([899e39b](https://github.com/QQuik/quik_proximity_marketing/commit/899e39b5c21e6a1e4606af2a9df21d899c7fe6f5))
- qr link ([d4ff6a9](https://github.com/QQuik/quik_proximity_marketing/commit/d4ff6a909535245a5cf981cce33a6a683637b8c9))
- referrer chart display and display top 5 most visit when hover ([a709115](https://github.com/QQuik/quik_proximity_marketing/commit/a7091151ab0902eed8585bf1bd22915b1a9c8fa5))
- regex for block ip address ([7124105](https://github.com/QQuik/quik_proximity_marketing/commit/712410507a1a8ff77ee01676dfa3d870cac41ff8))
- regex for block ip address ([055bcfb](https://github.com/QQuik/quik_proximity_marketing/commit/055bcfbe0f70e2db7861c5cd80b9aee43726737f))
- remove bg for loading screen ([26e8b90](https://github.com/QQuik/quik_proximity_marketing/commit/26e8b90a8a0a39a13a399af153059c472adce2a6))
- remove code test ([89f97c5](https://github.com/QQuik/quik_proximity_marketing/commit/89f97c5a902a92884cd1b25880dfc4edec917240))
- remove old file ([80723e0](https://github.com/QQuik/quik_proximity_marketing/commit/80723e0bb159749a06acd89f010e3815d2753f0e))
- remove provider in others layout ([e1f5b56](https://github.com/QQuik/quik_proximity_marketing/commit/e1f5b56964ac83f6f8cbca62b9e9c24870c66b68))
- remove test code ([d66d361](https://github.com/QQuik/quik_proximity_marketing/commit/d66d361725f40824ba412d79d2ce4025a66d56a2))
- remove webp on metatag image ([88f0a1e](https://github.com/QQuik/quik_proximity_marketing/commit/88f0a1e95a73911f786b65819def2d47c7063892))
- responsive in mobile devices ([b7ac32a](https://github.com/QQuik/quik_proximity_marketing/commit/b7ac32a105bb51b205cffc41117f1dc5cacf44be))
- revert limit ([914e537](https://github.com/QQuik/quik_proximity_marketing/commit/914e537d7dcf0dbba34207a5aa346a690e60a8fc))
- sameSite = None & log for cookie ([9f63085](https://github.com/QQuik/quik_proximity_marketing/commit/9f63085e079c118e5269e1a6fff81b67d19b239c))
- scroll for home page ([98c4336](https://github.com/QQuik/quik_proximity_marketing/commit/98c433601380418388c4c23e9a423bbc5a55dab0))
- show login call2action when user not logged in ([24d3906](https://github.com/QQuik/quik_proximity_marketing/commit/24d3906096c5daea9a086a96b7011e7ddbd206e7))
- test deploy ([a5ed4d2](https://github.com/QQuik/quik_proximity_marketing/commit/a5ed4d28fe15be1e3e4af23b2611d5ee038bd490))
- tp form dirty handle ([783c14d](https://github.com/QQuik/quik_proximity_marketing/commit/783c14d2174a742cb9794d462cb2826aee381e84))
- try to fix cookie ([ed8d035](https://github.com/QQuik/quik_proximity_marketing/commit/ed8d0354dbeac238620a1de943161451ddb93bee))
- try to fix i18n cookie not set on root domain ([c775589](https://github.com/QQuik/quik_proximity_marketing/commit/c775589ae550a5af61177dc71ff67efe4e700d49))
- ts err ([f41d7bf](https://github.com/QQuik/quik_proximity_marketing/commit/f41d7bfafc527c94d7e9b89088cee99f37ee3b62))
- typescript ([af8887b](https://github.com/QQuik/quik_proximity_marketing/commit/af8887b694f285e3ecc48a8d053594746ea4f4cf))
- typescript error ([cd71385](https://github.com/QQuik/quik_proximity_marketing/commit/cd7138574cf68bb9f68493011f89f4fd4069c35b))
- typo error in shlink api path ([0c98397](https://github.com/QQuik/quik_proximity_marketing/commit/0c983970e0320de3e19fe01e35cf899d7125b019))
- ui freeze on popover ([e485e3e](https://github.com/QQuik/quik_proximity_marketing/commit/e485e3ecb57589a1b9c0f3090abe1c9d44b60371))
- ui responsive ([f8875ee](https://github.com/QQuik/quik_proximity_marketing/commit/f8875ee84734d466b8854e0a6c67b52ff09e9826))
- update code ([fe8a881](https://github.com/QQuik/quik_proximity_marketing/commit/fe8a881ca27dfe08b9647b8c41b0e1d72f5bf25c))
- update content ([bb65f6a](https://github.com/QQuik/quik_proximity_marketing/commit/bb65f6a6af93d72bc21cf985c0970377cb695772))
- update db payment ([074e00b](https://github.com/QQuik/quik_proximity_marketing/commit/074e00bb14281198ccbf547e5165f046e6dcadc3))
- update env ([1212b82](https://github.com/QQuik/quik_proximity_marketing/commit/1212b82e6c7c77916675f42262ccc8229fd9e5c3))
- url for invitation when accept ([033e6b4](https://github.com/QQuik/quik_proximity_marketing/commit/033e6b4add88c50b6568b7971478883af0e91597))
- workflow to correct branch ([0eb8500](https://github.com/QQuik/quik_proximity_marketing/commit/0eb8500a88b4dd199dee68cb553207826b440a94))
- wrapped useCallback for window.location.href to prevent auto load in build stage ([ce9d44d](https://github.com/QQuik/quik_proximity_marketing/commit/ce9d44da6b4066eb3ab64d5d43b487067c8cc5e9))

### Features

- "handle back btn for app" ([e8a8623](https://github.com/QQuik/quik_proximity_marketing/commit/e8a8623720f15ee363ebe311ecbde72423df097c))
- add analytic view ([7f28531](https://github.com/QQuik/quik_proximity_marketing/commit/7f2853124aa76e28accf63c80267fd626b415b8c))
- add analytics for touch point & add comparison ([81d9f0b](https://github.com/QQuik/quik_proximity_marketing/commit/81d9f0b9e7e6d7d7c10a980cddb594b39ff1a1cb))
- add animation card ([25568da](https://github.com/QQuik/quik_proximity_marketing/commit/25568daaaf61395444615b78f1c82eebfa26f470))
- add app selection after login ([6278426](https://github.com/QQuik/quik_proximity_marketing/commit/6278426f7e1898c17f86cabb3f13b24d9ef5b42b))
- add app selection page with Proxify and Parcelvoy options ([d364117](https://github.com/QQuik/quik_proximity_marketing/commit/d36411748a828b45bf717d618386d563ece5a3c8))
- add audit log for email & registration event & first 200 premium grants ([495a252](https://github.com/QQuik/quik_proximity_marketing/commit/495a25205fb8a0df8d737138c9b3c591fca46648))
- add audit logs & new rpc func for campaign free 200 premium ([16b8acb](https://github.com/QQuik/quik_proximity_marketing/commit/16b8acbf73100aa056fdb522a0c54ac6b142f188))
- add campaign detail page & touch point list & handle for touch point create/delete ([cdd5da2](https://github.com/QQuik/quik_proximity_marketing/commit/cdd5da26d5d7d37e4e0d01cfd9e5a1616b9493e0))
- add campaign management ([#16](https://github.com/QQuik/quik_proximity_marketing/issues/16)) ([06e6792](https://github.com/QQuik/quik_proximity_marketing/commit/06e6792380745bfc47270d0b892be077b0a68243))
- add chat-woot ([55d1da4](https://github.com/QQuik/quik_proximity_marketing/commit/55d1da48e6e29741c53c390764b54035dc62393e))
- add custom domain handle ([5027a47](https://github.com/QQuik/quik_proximity_marketing/commit/5027a470c52f55bea1441d47b14d8044764e74b7))
- add custom domain support for touch point short links ([636767c](https://github.com/QQuik/quik_proximity_marketing/commit/636767ccd593988d55400d3b745e70d352960361))
- add dashboard page & analytics page ([713e04f](https://github.com/QQuik/quik_proximity_marketing/commit/713e04fcc38701d60b2b13a466d6c504737e000b))
- add dashboard view & components ([de4d858](https://github.com/QQuik/quik_proximity_marketing/commit/de4d8580d3dbfb490b249bbf44a8bd6860ead1d8))
- add detail vietnam map & show list location ([febb4c5](https://github.com/QQuik/quik_proximity_marketing/commit/febb4c59cde20b1be07ba4ff6e3b556c50b268f3))
- add dialog when not found profile & new method to check premium ([b12e206](https://github.com/QQuik/quik_proximity_marketing/commit/b12e2065843e2466a33d321826cc5a2959350906))
- Add docusaurus ([b1da105](https://github.com/QQuik/quik_proximity_marketing/commit/b1da105c30483dd7c85c6dc172eb541166124f51))
- add domain verification flow and improve UI for custom domains ([3bab761](https://github.com/QQuik/quik_proximity_marketing/commit/3bab761f2132d88cf42fd9e7701ce474ba13da2f))
- add env scripts and encoded .env ([47dc4f0](https://github.com/QQuik/quik_proximity_marketing/commit/47dc4f00c76544827094b0a87b82e2a0fe22c179))
- add error boundary to log error into openobserve ([99b6913](https://github.com/QQuik/quik_proximity_marketing/commit/99b691323d326e28d7f6d36c15305261b99dd526))
- add expires at into orgplan ([6f94dfc](https://github.com/QQuik/quik_proximity_marketing/commit/6f94dfcee6b0c07aed95652d04454050fcc98520))
- add export json file in docker compose ([9f0e3d0](https://github.com/QQuik/quik_proximity_marketing/commit/9f0e3d052bdd24985d24c6a1f56a7ef9930789d8))
- add filter/search/sort reusable components & default config for react-query, axios,.. ([6f6b200](https://github.com/QQuik/quik_proximity_marketing/commit/6f6b200ba72eb59be65fb38705a234d4c40aa2df))
- add free premium for limit 5 ip & 1 fp ([d39e363](https://github.com/QQuik/quik_proximity_marketing/commit/d39e36338d9969419567f1c0b697425550730bec))
- add gtm id to entry app ([43aaadc](https://github.com/QQuik/quik_proximity_marketing/commit/43aaadcff62174d6254c3ece240e5851ee75a4c5))
- add i18n for server ([#325](https://github.com/QQuik/quik_proximity_marketing/issues/325)) ([5dbe9f2](https://github.com/QQuik/quik_proximity_marketing/commit/5dbe9f2c6d2cc66aa220f5321216875019a50eb1))
- add integration form for touch point ([da1e263](https://github.com/QQuik/quik_proximity_marketing/commit/da1e263406878de41d95292ea23184cdc71df473))
- add integration limit and plan tracking for organizations ([9e66808](https://github.com/QQuik/quik_proximity_marketing/commit/9e66808249beba802e60ca7131ab8baf9e059c06))
- add integration module to menulist ([11c12be](https://github.com/QQuik/quik_proximity_marketing/commit/11c12be99c5ecb35a301efe0eb7ad2ca416290eb))
- add invitation detail API and query hook ([3db891e](https://github.com/QQuik/quik_proximity_marketing/commit/3db891e9d40e7e0c3ae6e97863a84f93d59a34a2))
- add limit 200 for free pre ([233e9ca](https://github.com/QQuik/quik_proximity_marketing/commit/233e9ca0a82c61dc4073a1bc1936408596a233a5))
- add login with google ([7f32180](https://github.com/QQuik/quik_proximity_marketing/commit/7f321805863ff1c20b977a8de54db63592dcf954))
- add member module ([662a0f6](https://github.com/QQuik/quik_proximity_marketing/commit/662a0f69182c8c04228640bbe0bdf66aca118026))
- add meta tags support for touch points with image upload ([6bc8823](https://github.com/QQuik/quik_proximity_marketing/commit/6bc8823f97002f824ca25aa239182bb564afe29c))
- add metadata as i18n ([5b35ffb](https://github.com/QQuik/quik_proximity_marketing/commit/5b35ffb67588fa68b3de965ccf0264a52cd3c4c0))
- add monthly plan for org & update plan lib ([#228](https://github.com/QQuik/quik_proximity_marketing/issues/228)) ([7000a5d](https://github.com/QQuik/quik_proximity_marketing/commit/7000a5d7ef6a20b925a185d50c8130a4d1d0e412))
- add NoDataIcon component and update UI styling across multiple components ([1b934fa](https://github.com/QQuik/quik_proximity_marketing/commit/1b934faee899c66b9c825697112f679f89c8d93b))
- add pagination & sorting handle ([f67020b](https://github.com/QQuik/quik_proximity_marketing/commit/f67020b3d4f3d4315b0a9c59ca4607e067baa644))
- add permission handler for BE & FE ([aaa0ba4](https://github.com/QQuik/quik_proximity_marketing/commit/aaa0ba422105af81de88a989906f25de806e9edf))
- add queue auto verify domain ([d4c458a](https://github.com/QQuik/quik_proximity_marketing/commit/d4c458aa4349798e0d20326280e409c8a89245ea))
- add release auto on cicd ([#334](https://github.com/QQuik/quik_proximity_marketing/issues/334)) ([bc59122](https://github.com/QQuik/quik_proximity_marketing/commit/bc591221d9131456e30e69becb8a6d1f2451b315))
- add reusable table ([89376ab](https://github.com/QQuik/quik_proximity_marketing/commit/89376abbe70b3c3cffbebc57cee9d924384aacf4))
- add sample config for nginx ([#201](https://github.com/QQuik/quik_proximity_marketing/issues/201)) ([927ad94](https://github.com/QQuik/quik_proximity_marketing/commit/927ad9439f6bf30cb32cb3434b7bd21cd54bacd5))
- add schedule calendar filter ([#32](https://github.com/QQuik/quik_proximity_marketing/issues/32)) ([c95bf7e](https://github.com/QQuik/quik_proximity_marketing/commit/c95bf7ec2b81f368fae5234b04612a352b32f8a5))
- add schedule delete action ([d367f55](https://github.com/QQuik/quik_proximity_marketing/commit/d367f5567675b82fa3736994c670d0a5cc05f679))
- add schedule schema & some schedule components ([8fb9384](https://github.com/QQuik/quik_proximity_marketing/commit/8fb9384eed0d5558379b7086d5b1c2601de4eac4))
- add short code as default slug ([04f7e0c](https://github.com/QQuik/quik_proximity_marketing/commit/04f7e0ccde65ae5231110317a665dc3c7edcfc36))
- add show confirm dialog method to formwarning provider ([3da861a](https://github.com/QQuik/quik_proximity_marketing/commit/3da861a1bdfece689ac3841e72c342f75e8b9f5b))
- add start/end adornment support to Input component and update touch point domain management ([90ce548](https://github.com/QQuik/quik_proximity_marketing/commit/90ce548c84e4261ed5677195de83ce7ad4ae3238))
- add tag module & remove tp, location module ([ae4d040](https://github.com/QQuik/quik_proximity_marketing/commit/ae4d040e995f73b3a2fc72d555cd1fdb212b4861))
- add tag module & remove tp, location module ([5da4936](https://github.com/QQuik/quik_proximity_marketing/commit/5da49361fdbbdc48d8b1ec89714391537ebf5826))
- add today performance & fix advanced form in tp ([3032f71](https://github.com/QQuik/quik_proximity_marketing/commit/3032f71e37d1ef4c13958c5ed4064fed53dae4c4))
- add tooltip & fix ui, new integration list UI ([18afa5e](https://github.com/QQuik/quik_proximity_marketing/commit/18afa5e53b5e573fb72fc26a471913b013fe196c))
- add topo map to view locations ([8030a1a](https://github.com/QQuik/quik_proximity_marketing/commit/8030a1a3e87ed5c50efb77bb9dd74c3f18f4cbc2))
- add touch point & location CRUD ([cce8213](https://github.com/QQuik/quik_proximity_marketing/commit/cce82133df29989f22cc46cca490fa6d48eae2df))
- add touch point advanced settings & utm form ([5d36cf3](https://github.com/QQuik/quik_proximity_marketing/commit/5d36cf3b72dc8388a6dd65ce1d69cc6092830d82))
- add touch point analytics page ([5498f11](https://github.com/QQuik/quik_proximity_marketing/commit/5498f111425445dbb0d522512267ef710691cf38))
- add touch point create/update/delete handle ([cd376a3](https://github.com/QQuik/quik_proximity_marketing/commit/cd376a391b3a5aa75afc059352225cd6d3512fbf))
- add touch point detail page & schedule components ([732d07b](https://github.com/QQuik/quik_proximity_marketing/commit/732d07bfc846f453c58542f8b0a1df044e99261f))
- add treafik to docker-compose.dev ([3d6a661](https://github.com/QQuik/quik_proximity_marketing/commit/3d6a6616fdfd38716705c61664aa4e6db20f0b7c))
- add ui & api for many modules ([a254d8c](https://github.com/QQuik/quik_proximity_marketing/commit/a254d8c14542371211ecd9b323ef5dce52b6eb8f))
- add user id to parcel get access token ([8659a69](https://github.com/QQuik/quik_proximity_marketing/commit/8659a698bd279cba99f51310ca1935faf2a2dcb6))
- add user tracking for custom slugs and disable account deletion temporarily ([cf652f3](https://github.com/QQuik/quik_proximity_marketing/commit/cf652f37b8dc32d5f6cf22140c37e90bb61f3b30))
- add verify url on tp form ([3f3d52c](https://github.com/QQuik/quik_proximity_marketing/commit/3f3d52c141093ebdbc88f16cf0f43fc8016ef75e))
- add vitest & remove docs ([#322](https://github.com/QQuik/quik_proximity_marketing/issues/322)) ([382a5ec](https://github.com/QQuik/quik_proximity_marketing/commit/382a5ecb6aac211d76469244131e3f1cdc979d92))
- change plan provider ([47f7687](https://github.com/QQuik/quik_proximity_marketing/commit/47f7687774b4c19575a3bfb13cb13abd29b25ba8))
- comment old file & add git workflows file ([#17](https://github.com/QQuik/quik_proximity_marketing/issues/17)) ([7a8cbb6](https://github.com/QQuik/quik_proximity_marketing/commit/7a8cbb6e2d8427996a7653e0b4ba5650491ae32b))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([60f6509](https://github.com/QQuik/quik_proximity_marketing/commit/60f6509b9c53a04b3ffc1a6b201bcaf3058f4ef2))
- finish tags CRUD & handle filter by tag for touch points ([#65](https://github.com/QQuik/quik_proximity_marketing/issues/65)) ([9282d60](https://github.com/QQuik/quik_proximity_marketing/commit/9282d60f154eaa6beac85f7c73b4b76f7ffb950f))
- fix login page ([e270ca5](https://github.com/QQuik/quik_proximity_marketing/commit/e270ca546811a3176e5e26490473e255312d0e38))
- fix refresh token invalid cause app redirect multi times ([ebfd588](https://github.com/QQuik/quik_proximity_marketing/commit/ebfd588af1041631d98747f14dc1eef4994a62cf))
- fix some bugs & add plan for meta tags ([838e18f](https://github.com/QQuik/quik_proximity_marketing/commit/838e18fcce4dbd5a606b5174c01412025dc9a152))
- handle form for condition node ([ff3c273](https://github.com/QQuik/quik_proximity_marketing/commit/ff3c2734ec9e1ed6216949354ce869e178377c7d))
- handle unsave form aleart ([2df70e4](https://github.com/QQuik/quik_proximity_marketing/commit/2df70e441c18e9870306ab69a5d5ace3b8fe71e7))
- implement flow builder with drag-and-drop nodes and properties sidebar ([d8ce71b](https://github.com/QQuik/quik_proximity_marketing/commit/d8ce71b02f7e14f3891d35c52b86697730848c84))
- init analytic page ([01b2000](https://github.com/QQuik/quik_proximity_marketing/commit/01b20005ceada2704fc3db57f07a8382631da7cc))
- init glitch ([daf9ba6](https://github.com/QQuik/quik_proximity_marketing/commit/daf9ba6cbfb41b53b7b9b9e722cf94eb77505670))
- init permissions ([1dd69f2](https://github.com/QQuik/quik_proximity_marketing/commit/1dd69f261f5682cbf34c81ec6ecefa7494db603a))
- init prj ([424a864](https://github.com/QQuik/quik_proximity_marketing/commit/424a86475e7ee361d598cc1deb8825a71953dc2e))
- Migrate organization provider to Zustand store and add form warning provider ([d560fa2](https://github.com/QQuik/quik_proximity_marketing/commit/d560fa2e637840e97b4d02c88c232c4c44a0252b))
- modify script and workflow to work with .env.development ([e1b2d5c](https://github.com/QQuik/quik_proximity_marketing/commit/e1b2d5cec75565b09fe92c284c5c8e9f7a6e2ba2))
- modify UI & flow ([7102a0f](https://github.com/QQuik/quik_proximity_marketing/commit/7102a0f859b7cd7369decaf3689a446f7e39ebcc))
- new tp flow for qr nfc wifi ([21b88b5](https://github.com/QQuik/quik_proximity_marketing/commit/21b88b59bdb29a8742747138b3ddf19fcfbeaa45))
- now chart map can show data ([6800fcc](https://github.com/QQuik/quik_proximity_marketing/commit/6800fcc9f9cb0c7f7a64aef0174b8f919781f8e5))
- refactor table actions ([7817055](https://github.com/QQuik/quik_proximity_marketing/commit/7817055dd1d2f135afd66a361471b4435d767b31))
- refactor URL validation and add country mapping center coordinates ([97f8a6e](https://github.com/QQuik/quik_proximity_marketing/commit/97f8a6e902a1c102ac2b8b68c4dfddbf3e042d49))
- remove app url on env ([a277b5b](https://github.com/QQuik/quik_proximity_marketing/commit/a277b5bff118b73e9de18eb0ef93559ea1dc0246))
- Remove schedule and location features, update permission handling ([ddf7c49](https://github.com/QQuik/quik_proximity_marketing/commit/ddf7c492f7d7ecc784c7c68a386caed1e48d8be6))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([79cd2e5](https://github.com/QQuik/quik_proximity_marketing/commit/79cd2e5cfbaafc36ad0d82a1bdc4a840c5286791))
- replace Sentry with bundle analyzer and refactor touch point activation UI ([4c5cecf](https://github.com/QQuik/quik_proximity_marketing/commit/4c5cecfba646b327a6936e5ddd7f659f84a082dc))
- responsive tablet in layout + some list page ([#203](https://github.com/QQuik/quik_proximity_marketing/issues/203)) ([5f29ad9](https://github.com/QQuik/quik_proximity_marketing/commit/5f29ad94e15271f5c54a8f881d2594760931b9e3))
- set casdoor token for supabase client ([1855554](https://github.com/QQuik/quik_proximity_marketing/commit/18555541eb32b780f035d3f9a580022830486bd4))
- sidebar handle for mobile & tablet & desktop ([2a14b80](https://github.com/QQuik/quik_proximity_marketing/commit/2a14b80f73af8149fb5681c53d09b511a099c949))
- split upload logics ([943c00e](https://github.com/QQuik/quik_proximity_marketing/commit/943c00eb71f0cdb7e0f4aa4dc10d66cf5494185c))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([afb57dd](https://github.com/QQuik/quik_proximity_marketing/commit/afb57dd29b77579aae2d58b23b6cb52e1a5a6a24))
- update account suspension ([#68](https://github.com/QQuik/quik_proximity_marketing/issues/68)) ([2f8b975](https://github.com/QQuik/quik_proximity_marketing/commit/2f8b975ce1c5aaec1e058fd10496aa0d144ae53c))
- update authenticator app ([bbbcf20](https://github.com/QQuik/quik_proximity_marketing/commit/bbbcf20c493721a2e2f29a62df63428971cdf95d))
- update better ui for url verification in create tp ([1672231](https://github.com/QQuik/quik_proximity_marketing/commit/1672231f571d04720799a88cdc86fe684603c664))
- update custom domain UI & add docs to vscode ignore ([#199](https://github.com/QQuik/quik_proximity_marketing/issues/199)) ([732dfc9](https://github.com/QQuik/quik_proximity_marketing/commit/732dfc90d26c8e5a305d9c2bd589e75985e65057))
- update custom utm ([b6c19aa](https://github.com/QQuik/quik_proximity_marketing/commit/b6c19aa5cfbf8519f6b6bb039184e716e042a8fa))
- update env ([f35fa72](https://github.com/QQuik/quik_proximity_marketing/commit/f35fa729a9004f3f0607bc5258909f453e41f49f))
- update ESLint rules, enhance Next.js config, and add Docker support ([bac1548](https://github.com/QQuik/quik_proximity_marketing/commit/bac1548de7731659bba72439654e6d30557ff3fe))
- update ESLint rules, enhance Next.js config, and add Docker support ([80becff](https://github.com/QQuik/quik_proximity_marketing/commit/80becff7e71ba7d643a09b56a3af6aadcc17f434))
- update free premium for block limit ([330fdb4](https://github.com/QQuik/quik_proximity_marketing/commit/330fdb442ec0d00ae5ac51772554caf4293a0968))
- update gg auth ([4cc8cc5](https://github.com/QQuik/quik_proximity_marketing/commit/4cc8cc5e3017779bce668106bb9d5527682a8eb6))
- update integration ([4c27835](https://github.com/QQuik/quik_proximity_marketing/commit/4c278359fad4f23242bdef7e6fa8e2f822ed4917))
- update integration UI & add logger pino ([f68afd9](https://github.com/QQuik/quik_proximity_marketing/commit/f68afd9c0e01ce3822b81ceab5a5fcc6e2cd52bb))
- update limit domain ([340c818](https://github.com/QQuik/quik_proximity_marketing/commit/340c81864c392b82f90d94813a862cb5f7fa9007))
- update mail mfa ([cc4bd5b](https://github.com/QQuik/quik_proximity_marketing/commit/cc4bd5b997f6ad093bd55715d2c315e9419cb356))
- update mail mfa ([866e5a9](https://github.com/QQuik/quik_proximity_marketing/commit/866e5a932c860360b38ce72b609ae84052139483))
- update mfa ui ([98c87c2](https://github.com/QQuik/quik_proximity_marketing/commit/98c87c2622ba1fd3d42e683256a377a18dc12770))
- update plan ([fe5407d](https://github.com/QQuik/quik_proximity_marketing/commit/fe5407d4eec8a39eb4766a1111c392b80b93ca8c))
- update plan ([fd2d0d2](https://github.com/QQuik/quik_proximity_marketing/commit/fd2d0d2b2b0c6b08ed5494a68fefd5ccfd5a5854))
- update plans ([1621f35](https://github.com/QQuik/quik_proximity_marketing/commit/1621f353c5fabbf8ca5fe861ecb67d241ed0eadf))
- update plans ([8750f97](https://github.com/QQuik/quik_proximity_marketing/commit/8750f9776e990c49d8956e59a2606f640047968f))
- update redis ([a63ddca](https://github.com/QQuik/quik_proximity_marketing/commit/a63ddca09f44d485bffb219d47ece44a1e1e2b39))
- update responsive for sidebar & navbar ([192921a](https://github.com/QQuik/quik_proximity_marketing/commit/192921a5a97d580af2bf15d7a655a3ddde220232))
- update sidebar ui ([27b49dc](https://github.com/QQuik/quik_proximity_marketing/commit/27b49dc75f582ee650f1e7d4ca22eb78d2da9145))
- update ui for tp advanced settings & tp update slug ([8b84bc1](https://github.com/QQuik/quik_proximity_marketing/commit/8b84bc10abe35956aee33d59c44eb3ef71c66d1e))
