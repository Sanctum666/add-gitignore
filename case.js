const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, getContentType, jidDecode, proto, generateWAMessageFromContent } = require('baileys-mod');
const { Boom } = require('@hapi/boom');
const generateCardBySymbol = require('./full');
let lastMsg = null;
let Glosender = null;

const decodeJid = (jid) => {
    const { user, server } = jidDecode(jid) || {};
    return user + '@' + server;
};

async function BotWa() {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const Jilpa = await makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: require('pino')({ level: 'silent' }) 
    });

    Jilpa.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // if (qr) {
        //     console.log('Pindai QR code ini untuk terhubung:');
        //     qrcode.generate(qr, { small: true });
        // }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut :
                true;
            console.log('Koneksi terputus karena ', lastDisconnect.error, ', mencoba menghubungkan kembali...', shouldReconnect);
            if (shouldReconnect) {
                BotWa();
            }
        } else if (connection === 'open') {
            console.log('Terhubung ke WhatsApp! 🎉');
        }
    });

    Jilpa.ev.on('creds.update', saveCreds);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    Jilpa.React = async (jid, emoji) => {
        Jilpa.sendMessage(jid, { react: {text: emoji, key: lastMsg.key }})
    }

    async function reply(jid, text, lastMsg) {
        Jilpa.sendMessage(jid, {
                text: text,
                contextInfo: {
                    externalAdReply: {
                        title: "zrteam_id",
                        body: "This script was created by jilpa",
                        thumbnailUrl: "https://github.com/kiuur.png",
                        sourceUrl: 'https://pornhub.com',
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    }
                }
            }, { quoted: lastMsg })
    }

    Jilpa.Edit = async (jid, newtext, key) => {
        Jilpa.sendMessage(jid,{
            text: newtext,
            edit: key.key
        })
    }

    Jilpa.Menu = async (jid, newtext, Glosender, lastMsg) => {
        Jilpa.sendMessage(jid, {
            text: newtext,
            mentions: [Glosender],
            contextInfo: {
                externalAdReply: {
                    title: "Zrteam_id",
                    body: "This script was created by Zilfa",
                    sourceUrl: "",
                    mediaUrl: "",
                    thumbnailUrl: "https://i.pinimg.com/736x/1a/dd/88/1add8816fb6165756ba1698a206500b1.jpg",
                    sourceUrl: 'https://amoi.com',
                    showAdAttribution: true,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                }
            }
        }, { quoted: lastMsg })
    }

    Jilpa.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            lastMsg = msg;

            if (!msg.message || msg.key.fromMe) return; 

            const from = msg.key.remoteJid;
            const pushName = msg.pushName || "Tanpa Nama";
            const sender = msg.key.fromMe ? decodeJid(Jilpa.user.id) : decodeJid(msg.key.participant || msg.key.remoteJid);
            Glosender = sender;
            const senderNumber = sender.split('@')[0];

            const type = getContentType(msg.message);
            const body = (type === 'conversation') ? msg.message.conversation :
                        (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text :
                        (type === 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage.selectedButtonId :
                        (type === 'listResponseMessage') ? msg.message.listResponseMessage.singleSelectReply.selectedRowId :
                        '';

            if (body === '') return; 

            const prefix = /^[\\/!.]/g.test(body) ? body.match(/^[\\/!.]/g)[0] : '/';
            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
            const query = body.trim().split(/ +/).slice(1).join(' ');

            console.log(`[PESAN MASUK]
    - Dari: ${pushName} (${from})
    - Command: ${command || 'Tidak ada'}
    - Query: ${query || 'Tidak ada'}`);

            switch (command) {
                case 'ping':
                    await Jilpa.sendMessage(from, { text: 'Pong! 🏓' }, { quoted: msg });
                    break;

                case 'coin':
                    if (query) {
                        const coinSymbol = query.toUpperCase();
                        // await Jilpa.sendMessage(from, { text: `⏳ Sedang memproses data untuk *${coinSymbol}*...` }, { quoted: msg });
                        // await Jilpa.sendMessage(from,
                        //     {
                        //         react: {
                        //             text: '⏳',
                        //             key: msg.key
                        //         }
                        //     }
                        // )

                        await Jilpa.React(from, '⏳')

                        try {
                            const buffer = await generateCardBySymbol(coinSymbol);
                            await Jilpa.sendMessage(from, {
                                image: buffer,
                                caption: `Ini data yang kamu minta untuk *${coinSymbol}*`
                            }, { quoted: msg });
                        } catch (error) {
                            console.error(`Error generating card for ${coinSymbol}:`, error);
                            await Jilpa.sendMessage(from, { text: `Maaf, terjadi kesalahan saat mengambil data untuk ${coinSymbol}. Pastikan simbol koin benar.` }, { quoted: msg });
                        }
                    }
                    else {
                        const buttons = [
                            { buttonId: '/coin doge', buttonText: { displayText: 'DOGE' }, type: 2 },
                            { buttonId: '/coin pepe', buttonText: { displayText: 'PEPE' }, type: 2 },
                            { buttonId: '/coin btc', buttonText: { displayText: 'BTC' }, type: 2 },
                            { buttonId: '/coin usdt', buttonText: { displayText: 'USDT' }, type: 2 },
                            { buttonId: '/coin eth', buttonText: { displayText: 'ETH' }, type: 2 },
                        ]
                        const buttonMessage = {
                            text: `Hai, @${senderNumber}! Silakan pilih koin yang tersedia di bawah, atau ketik *${prefix}coin [simbol]* (contoh: *${prefix}coin BTC*).`,
                            mentions: [sender],
                            footer: 'Zrteam_id',
                            buttons,
                            viewOnce: true,
                            headerType: 2
                        };
                        await Jilpa.sendMessage(from, buttonMessage, { quoted: null });
                    }
                    break;

                case 'menu':
                    Jilpa.Menu(from, `*Hai* @${senderNumber}, Bot ini sedang dalam pengembangan`, sender, msg);
                    // const loadingMessage = await Jilpa.sendMessage(from, {
                    //     text: 'Memulai Menu...',
                    //     contextInfo: {
                    //         externalAdReply: {
                    //             title: "Zrteam_id",
                    //             body: "This script was created by Zilfa",
                    //             sourceUrl: "",
                    //             mediaUrl: "",
                    //             thumbnailUrl: "https://i.pinimg.com/736x/1a/dd/88/1add8816fb6165756ba1698a206500b1.jpg",
                    //             sourceUrl: 'https://amoi.com',
                    //             showAdAttribution: true,
                    //             mediaType: 1,
                    //             renderLargerThumbnail: true,
                    //         }
                    //     }
                    // }, { quoted: msg });

                    // if (!loadingMessage) {
                    //     console.error("Gagal mengirim pesan loading awal.");
                    //     return; 
                    // }

                    // const barLength = 15; 
                    // const filledChar = '█'; 
                    // const emptyChar = '░';  

                    // for (let i = 0; i <= barLength; i++) {
                    //     const percentage = Math.round((i / barLength) * 100);
                    //     const filled = filledChar.repeat(i);
                    //     const empty = emptyChar.repeat(barLength - i);
                        
                    //     const loadingText = `*Memuat Menu...*\n\n[${filled}${empty}] ${percentage}%`;
                        
                    //     // await Jilpa.Edit(from, loadingText, loadingMessage);
                    //     await Jilpa.sendMessage(from, {
                    //     text: loadingText,
                    //     edit: loadingMessage.key,
                    //     mentions: [sender],
                    //     contextInfo: {
                    //         externalAdReply: {
                    //             title: "Zrteam_id",
                    //             body: "This script was created by Zilfa",
                    //             sourceUrl: "",
                    //             mediaUrl: "",
                    //             thumbnailUrl: "https://i.pinimg.com/736x/1a/dd/88/1add8816fb6165756ba1698a206500b1.jpg",
                    //             sourceUrl: 'https://amoi.com',
                    //             showAdAttribution: true,
                    //             mediaType: 1,
                    //             renderLargerThumbnail: true,
                    //         }
                    //     }
                    // }, { quoted: msg })

                    //     await delay(2000); 
                    // }

                    // const menuText = '*Menu Selesai di muat..*';

                    // await Jilpa.Edit(from, menuText, loadingMessage);
                    // await Jilpa.sendMessage(from, {
                    //     text: `*Hai* @${senderNumber}, Bot ini sedang dalam pengembangan`,
                    //     edit: loadingMessage.key,
                    //     mentions: [sender],
                    //     contextInfo: {
                    //         externalAdReply: {
                    //             title: "Zrteam_id",
                    //             body: "This script was created by Zilfa",
                    //             sourceUrl: "",
                    //             mediaUrl: "",
                    //             thumbnailUrl: "https://i.pinimg.com/736x/1a/dd/88/1add8816fb6165756ba1698a206500b1.jpg",
                    //             sourceUrl: 'https://amoi.com',
                    //             showAdAttribution: true,
                    //             mediaType: 1,
                    //             renderLargerThumbnail: true,
                    //         }
                    //     }
                    // }, { quoted: msg });
                    break;
                
                case 'tes':
                    await reply(from, "tes", lastMsg);
                    break;
                
                default:
                    if (!isCmd) {
                        if (body.toLowerCase() === 'halo' || body.toLowerCase() === 'hai') {
                            await Jilpa.sendMessage(from, { text: 'Halo juga! Ada yang bisa saya bantu?' }, { quoted: msg });
                        }
                    }
            }

        } catch (err) {
            console.error("Terjadi error di messages.upsert:", err);
        }
});

}

BotWa();