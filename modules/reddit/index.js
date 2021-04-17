const https = require("https")
const reddit = require("raw.js")

//var modules
var client

exports.init = function(e) {

    client = e.client
    //modules = e.modules
    //e.config.modules.reddit = {};
    //config = e.config.modules.reddit;



    client = e.client
}


exports.commands = {
    "reddit": {
        usage: "<subreddt>",
        args: 1,
        //execute: randomPost
    },
    "reddit.live": {
        usage: "<id>",
        tags: "owner",
        args: 1,
        execute(e) {
            redditLive(e.args[0], e.channel.id)
        }
    }
}

/**
 * [redditLive description]
 * @param  {string} id        [description]
 * @param  {string} channelId [description]
 */
function redditLive(id, channelId)
{
    var channel = client.channels.cache.get(channelId)

    var reader = new reddit.LiveThreadReader(id)
    reader.on("error", (err) => {
        channel.send("```diff\nError:\n- " + err + "```")
    })

    reader.on("bad-data", (err) => {
        channel.send("```diff\nBad Data:\n- " + err + "```")
    })

    reader.on("connected", () => {
        channel.send("[Live] Connected to Reddit.")
    })

    reader.on("disconnected", () => {
        channel.send("[Live] Disconnected from Reddit.")
    })

    reader.on("closed", () => {
        channel.send("[Live] Thread Closed.")
        reader = undefined
    })

    reader.on("update", (data) => {
        channel.send("**/u/" + data.author + ": **\n" + data.body + "")
    })
    //reader.on("activity", (count, fuzzed) => {
        //e.channel.send("```Activity:\n" + count + "```")
    //})
    //reader.on("embeds", (liveupdate_id, media_embeds) => {
        //e.channel.send("```Embeds```")
    //})
    reader.on("settings", (payload) => {
        channel.send("```Settings:\n" + payload + "```")
    })
    reader.on("strike", (payload) => {
        channel.send("```Strike:\n" + payload + "```")
    })
    reader.on("delete", (payload) => {
        channel.send("```Delete:\n" + payload + "```")
    })


}

// stole this from Windsdon
// eslint-disable-next-line no-unused-vars
function randomPost(e) {
    if(!e.args[0].match(/^[a-zA-Z0-9_-]+$/)) {
        e.channel.send(`${e.args[0]} is not a valid subreddit`)
        return
    }

    https.get({
        hostname: "api.reddit.com",
        path: "/r/" + e.args[0] + "?limit=100",
        headers: {
            "User-Agent": "node:discord-reddit-mod:v0.1.0"
        }
    }, function(res) {
        var body = ''
        res.on('data', function(chunk) {
            body += chunk
        })
        res.on('end', function() {
            if(res.statusCode != 200) {
                e.channel.send(`/r/${e.args[0]} is not an existing subreddit`)
                return
            }

            try {
                var response = JSON.parse(body)
            } catch(e) {
                e.channel.send("An internal error has occured.")
                return
            }

            var posts = []
            response.data.children.forEach(function(v) {
                v.data.url = v.data.url.replace(/\?.*$/i, '') // stole this from Zephy
                if(!v.data) { // skip invalid
                    return
                }
                if(/(\.png|\.jpg)$/.test(v.data.url)) {
                    posts.push({
                        url: v.data.url,
                        title: v.data.title
                    })
                }
            })

            if(posts.length == 0) {
                e.channel.send(`No suitable posts on /r/${e.args[0]}`)
                return
            }

            var post = posts[Math.floor(Math.random() * posts.length)]

            e.channel.send(`/r/${e.args[0]}\nTitle: ${post.title}\n${post.url}`)
        })
    }).on('error', function(err) {
        console.error(`Error: ${err.message}`)
    })
}
