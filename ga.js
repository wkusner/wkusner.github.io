/* Google Analytics 4 for wkusner.github.io: every page loads this one file, so the measurement ID is set here, once.
   Until an ID is filled in, it does nothing. It also does nothing on a local preview, or for a browser that asks not to be tracked. */
(function(){
  var ID = "G-E326RRGGNN";   // the GA4 measurement ID, like "G-ABC123DEF4" (Google Analytics → Admin → Data streams → the site's stream)
  var h = location.hostname;
  if(!ID || h === "localhost" || h === "127.0.0.1" || h === "") return;
  if(navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl) return;
  var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID; document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag; gtag("js", new Date()); gtag("config", ID);
})();
