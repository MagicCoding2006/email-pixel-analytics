export function buildPixelScript(bodyTemplate, pixelUrl) {
  return `(function () {
  var composers = Array.from(document.querySelectorAll('div[contenteditable="true"][role="textbox"]'))
    .filter(function (element) {
      return element.getAttribute('aria-label') === 'Message Body' && element.getClientRects().length;
    });
  if (composers.length !== 1) {
    console.error('Keep exactly one Gmail compose window open, then run this script again.');
    return;
  }
  var body = composers[0];
  var pixelUrl = ${JSON.stringify(pixelUrl)};
  if (Array.from(body.querySelectorAll('img[data-mail-signal-id]')).some(function (image) {
    return image.getAttribute('data-mail-signal-id') === pixelUrl;
  })) {
    console.info('This pixel is already in the message.');
    return;
  }
  body.focus();
  var selection = window.getSelection();
  var range = document.createRange();
  range.selectNodeContents(body);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  if (!document.execCommand('insertText', false, ${JSON.stringify(bodyTemplate)})) {
    body.appendChild(document.createTextNode(${JSON.stringify(bodyTemplate)}));
  }
  var pixel = document.createElement('img');
  pixel.src = pixelUrl;
  pixel.setAttribute('data-mail-signal-id', pixelUrl);
  pixel.width = 1;
  pixel.height = 1;
  pixel.alt = '';
  pixel.style.cssText = 'width:1px;height:1px;border:0;';
  body.appendChild(pixel);
  body.dispatchEvent(new Event('input', { bubbles: true }));
  console.info('Message and tracking pixel added. Send your email, then return to Mail Signal and mark it as sent.');
})();`;
}
