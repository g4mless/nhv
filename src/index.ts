import { Elysia, t } from "elysia";
import { html } from "@elysiajs/html";

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nhv - nhentai viewer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org"></script>
  <style>
    .spoiler {
      filter: blur(15px);
      transition: filter 0.3s ease;
      cursor: pointer;
    }
    .spoiler.revealed {
      filter: blur(0px);
    }
  </style>
</head>
<body class="bg-neutral-900 text-white">
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">nhentai viewer</h1>
      
      <div class="mb-8">
        <input 
          type="text" 
          id="gallery-id" 
          placeholder="Enter gallery ID (6 digits)" 
          class="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          maxlength="6"
        >
        <button 
          type="button"
          class="mt-4 w-full px-4 py-2 bg-red-600 hover:bg-red-700 font-semibold transition"
          onclick="
            const id = document.getElementById('gallery-id').value;
            htmx.ajax('GET', '/view/' + id, {target: '#result'});
          "
        >
        Search
        </button>
      </div>

      <div id="result" class="space-y-6"></div>
    </div>
  </div>

  <script>
    document.getElementById('gallery-id').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.querySelector('button').click();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('spoiler')) {
        e.target.classList.toggle('revealed');
      }
    });
  </script>
</body>
</html>`

export default new Elysia()
  .use(html())
  //.get("/", () => Bun.file("public/index.html").text())
  //.get("/", () => indexHtml)
  .get("/", async () => Bun.file("public/index.html").text())

  .get("/cover/:mediaId/:type", async ({ params }) => {
    const { mediaId, type } = params;
    const coverUrl = `https://t1.nhentai.net/galleries/${mediaId}/cover.${type}`;
    
    const response = await fetch(coverUrl);
    return new Response(response.body, {
      headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg" }
    });
  }, {
    params: t.Object({ mediaId: t.String(), type: t.String() })
  })

  .get("/view/:id", async ({ params, set }) => {
    const { id } = params;

    try {
      const res = await fetch(`https://nhentai.net/api/gallery/${id}`)
      const data = await res.json()

      const typeMap = { j: 'jpg', p: 'png', w: 'webp' };
      const coverUrl = `/cover/${data.media_id}/${typeMap[data.images.cover.t as keyof typeof typeMap] || 'jpg'}`
      const uploadDate = new Date(data.upload_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const tags = data.tags.reduce((acc: any, tag: any) => {
        if (!acc[tag.type]) acc[tag.type] = [];
        acc[tag.type].push({ name: tag.name });
        return acc;
      }, {});

      return `
        <div class="bg-neutral-800 overflow-hidden p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-2xl font-bold">${data.title.pretty}</h2>
              <p class="text-sm text-gray-400 mt-1">Uploaded: ${uploadDate}</p>
            </div>
            <a href="https://nhentai.net/g/${id}" target="_blank" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition">Visit</a>
          </div>
          <div class="mb-6">
            <img src="${coverUrl}" alt="Cover" class="spoiler w-48 h-auto">
            <p class="text-sm text-gray-400 mt-2">Click to reveal</p>
          </div>
          <div class="space-y-4">
            ${Object.entries(tags).map(([type, items]: any) => `
              <div>
                <h3 class="text-lg font-semibold text-red-700 capitalize">${type}</h3>
                <div class="flex flex-wrap gap-2 mt-2">
                  ${items.map((tag: any) => `<span class="bg-neutral-700 px-3 py-1 rounded-md text-md font-semibold">${tag.name}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (error) {
      return `<div class="text-red-500">Gallery not found</div>`;
    }
  }, {
    params: t.Object({ id: t.String()})
  })
