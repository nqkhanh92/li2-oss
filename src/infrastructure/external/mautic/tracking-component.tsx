import { useEffect } from 'react'

export const MauticTrackingComponent = () => {
  useEffect(() => {
    const script = document.createElement('script')
    script.innerHTML = `
            (function(w,d,t,u,n,a,m){w['MauticTrackingObject']=n;
                w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)},a=d.createElement(t),
                m=d.getElementsByTagName(t)[0];a.async=1;a.src=u;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://example.com/mtc.js','mt');

            mt('send', 'pageview');
        `
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])
  return null
}
