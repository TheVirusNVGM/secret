export default {
  async fetch(request) {
    return new Response(await fetch("index.html"), {
      headers: {"content-type": "text/html"}
    });
  }
}
