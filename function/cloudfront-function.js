function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }

  if (uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
