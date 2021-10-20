const express = require("express")
const cheerio = require("cheerio")
const fetch = require("node-fetch")
const cors = require("cors")
const { URL } = require("url")

const app = express()
const port = process.env.PORT || 3000
const proxyURL = "/proxy?u="
const urlRegex =
  /(https|https)?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
// const urlRegex = /^((http|https):\/\/)?([a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+.*)$/gm

const fromBase64 = (data) => {
  return new Buffer.from(data, "base64").toString("ascii")
}

const toBase64 = (data) => {
  return new Buffer.from(data).toString("base64")
}

app.use(cors())
app.use("/", express.static("dist"))

app.use("/proxy", async (req, res) => {
  const url = fromBase64(req.query.u)
  const rootUrl = new URL(url).origin

  if (!url) {
    res.setHeader(404)
    res.end("404 - Not Found")
  } else {
    const data = await fetch(url, {
      method: req.method,
      headers: {
        "user-agent": req.headers["user-agent"],
      },
    }).then(async (res) => {
      if (res.headers.get('content-type').includes("text/html")) {
        const body = await res.text()

        const serialize = ($, attr) => {
          $(`[${attr}]`).each((_, el) => {
            el = $(el)

            el.attr(attr, (_, data) => {
              if (data.includes("data:")) return data

              return data
                .split(" ")
                .map((el) => {
                  return (
                    proxyURL + toBase64(urlRegex.test(el) ? el : rootUrl + el)
                  )
                })
                .join(" ")
            })
          })
        }

        const $ = cheerio.load(body)
        serialize($, "href")
        serialize($, "link")
        serialize($, "src")
        serialize($, "srcset")

        $("[integrity]").each((_, el) => {
          $(el).removeAttr("integrity")
        })

        res.newBody = $.html()
      } else if (res.headers.get('content-type').includes('text/css')) {
        const body = await res.text()

        res.newBody = body.toString().replace(/url\(.+?\)/g, (link) => {
          link = link.match(/\(([^)]+)\)/)[1]

          if (link.includes("data:")) return `url(${link})`

          return (
            "url(" +
            proxyURL +
            toBase64(urlRegex.test(link) ? link : rootUrl + link) +
            ")"
          )
        })
      }

      return res
    })

    res.type(data.headers.get("content-type"))
    res.header(data.statusCode)

    if (!data.newBody) 
      data.body.pipe(res)
    else
      res.end(data.newBody)
  }
})

app.get("/robots.txt", (req, res) => {
  res.type("text/plain")
  res.send("User-agent: *")
})

app.listen(port, () => {
  console.log(`[i] Server listening on port: ${port}`)
})
