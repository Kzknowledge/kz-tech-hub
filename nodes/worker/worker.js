export default {
  async fetch(request, env) {

    const url = new URL(request.url)

    if (url.pathname === "/research") {

      const query = url.searchParams.get("q")

      const ai = await env.AI.run(
        "@cf/meta/llama-3-8b-instruct",
        {
          messages: [
            { role: "system", content: "You are an AI research assistant for the Kimiyyar Zahiri Tech Hub." },
            { role: "user", content: query }
          ]
        }
      )

      return new Response(JSON.stringify(ai), {
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response("KZ AI Worker Running")
  }
}
