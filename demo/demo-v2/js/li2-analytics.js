// Li2 Analytics SDK Initialization
!(function (c, n) {
  c[n] =
    c[n] ||
    function () {
      ;(c[n].q = c[n].q || []).push(arguments)
    }
  ;['trackLead', 'trackSale', 'trackEvent', 'identify'].forEach(
    (t) => (c[n][t] = (...a) => c[n](t, ...a))
  )
  var s = document.createElement('script')
  s.defer = 1
  s.src = 'http://localhost:8787/local/9c5cd872_cab202d5c44ad017affca690375798f3'
  // s.src = '../js/dist/index.global.js'
  // s.setAttribute('data-publishable-key', 'li2_pk_9c5cd872_cab202d5c44ad017affca690375798f3')
  // s.setAttribute('data-api-url', 'https://example.com')
  // s.setAttribute('data-api-url', 'http://localhost:8088')
  // s.setAttribute('data-pageview', 'true')
  // s.setAttribute('data-clicks', 'true')
  // s.setAttribute('data-scroll', 'true')
  s.setAttribute('data-debug', 'true')
  // s.setAttribute('data-forms', 'true')
  document.head.appendChild(s)
})(window, 'li2Analytics')
