import { Elysia, t } from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from '@elysiajs/static'

export default new Elysia()
  .use(html())
  .use(staticPlugin({ assets: "public" }))
  .get("/", () => Bun.file("public/index.html").text())

  .get("/view/:id", async ({ params, set }) => {
    const { id } = params;

    try {
      const res = await fetch(`https://nhentai.net/api/gallery/${id}`)
      const data = await res.json()

      const typeMap = { j: 'jpg', p: 'png', w: 'webp' };
      const coverUrl = `https://t1.nhentai.net/galleries/${data.media_id}/cover.${typeMap[data.images.cover.t as keyof typeof typeMap] || 'jpg'}`;
      const tags = data.tags.reduce((acc: any, tag: any) => {
        if (!acc[tag.type]) acc[tag.type] = [];
        acc[tag.type].push({ name: tag.name });
        return acc;
      }, {});

      return `
        <div class="bg-neutral-800 overflow-hidden p-6">
          <h2 class="text-2xl font-bold mb-4">${data.title.pretty}</h2>
          <div class="mb-6">
            <img src="${coverUrl}" alt="Cover" class="spoiler w-48 h-auto">
            <p class="text-sm text-gray-400 mt-2">Click to reveal</p>
          </div>
          <div class="space-y-4">
            ${Object.entries(tags).map(([type, items]: any) => `
              <div>
                <h3 class="text-lg font-semibold text-red-700 capitalize">${type}</h3>
                <div class="flex flex-wrap gap-2 mt-2">
                  ${items.map((tag: any) => `<span class="bg-neutral-700 px-3 py-1 rounded-sm text-sm">${tag.name}</span>`).join('')}
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
