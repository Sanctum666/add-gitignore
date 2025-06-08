const { createCanvas, registerFont, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); 

try {
  registerFont(path.join(__dirname, 'Poppins-Regular.ttf'), { family: 'Poppins' });
  registerFont(path.join(__dirname, 'Poppins-Bold.ttf'), { family: 'Poppins', weight: 'bold' });
  console.log("✒️ Font 'Poppins' berhasil didaftarkan.");
} catch (error) {
  console.error("❌ Font gagal didaftarkan. Gunakan Arial.");
}

const config = {
  width: 900,
  height: 320,
  padding: 50,
  colors: {
    background: '#FFFFFF',
    textPrimary: '#1a1a1a',
    textSecondary: '#555555',
    accentGreen: '#16c784',
    accentRed: '#ea3943',
    logoCircleBg: '#f0f0f0'
  },
  fonts: {
    body: 'Poppins, Arial, sans-serif',
    bold: 'bold Poppins, Arial, sans-serif'
  }
};

async function drawLogo(ctx, data) {
  const circleX = config.height / 2 + config.padding / 2;
  const circleY = config.height / 2;
  const circleRadius = config.height / 2 * 0.8;

  ctx.save();
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
  ctx.closePath();

  if (data.logoUrl) {
    try {
      ctx.clip();
      const logoImage = await loadImage(data.logoUrl);
      const aspect = logoImage.height / logoImage.width;
      let iw, ih;
      if (aspect > 1) {
        iw = circleRadius * 2;
        ih = iw * aspect;
      } else {
        ih = circleRadius * 2;
        iw = ih / aspect;
      }
      ctx.drawImage(logoImage, circleX - iw / 2, circleY - ih / 2, iw, ih);
    } catch {
      await drawTextLogo(ctx, data.logoText || '?', circleX, circleY, circleRadius);
    }
  } else {
    await drawTextLogo(ctx, data.logoText || '?', circleX, circleY, circleRadius);
  }

  ctx.restore();
}

async function drawTextLogo(ctx, text, x, y, radius) {
  ctx.fillStyle = config.colors.logoCircleBg;
  ctx.fill();
  ctx.fillStyle = config.colors.textSecondary;
  ctx.font = `${config.fonts.bold} ${radius * 0.6}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawInfo(ctx, data) {
  const textStartX = config.height + config.padding;
  const textCenterY = config.height / 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = `42px ${config.fonts.body}`;
  ctx.fillStyle = config.colors.textSecondary;
  ctx.fillText(data.coinName, textStartX, textCenterY - 10);

  const nameWidth = ctx.measureText(data.coinName).width;
  const changeX = textStartX + nameWidth + 20;
  const arrow = data.isUp ? '▲' : '▼';
  ctx.fillStyle = data.isUp ? config.colors.accentGreen : config.colors.accentRed;
  ctx.font = `38px ${config.fonts.body}`;
  ctx.fillText(`${arrow} ${data.change}%`, changeX, textCenterY - 10);

  ctx.textBaseline = 'top';
  ctx.font = `${config.fonts.bold} 72px`;
  ctx.fillStyle = config.colors.textPrimary;
  const formattedPrice = `${data.currency} ${data.price.toLocaleString(data.locale)}`;
  ctx.fillText(formattedPrice, textStartX, textCenterY - 5);
}

async function createCryptoCard(data) {
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = config.colors.background;
  ctx.fillRect(0, 0, config.width, config.height);

  await drawLogo(ctx, data);
  drawInfo(ctx, data);

  const buffer = canvas.toBuffer('image/png');
  return buffer;
//   fs.writeFileSync(outputPath, buffer);
//   console.log(`✅ Gambar disimpan: ${outputPath}`);
}

async function getCryptoData() {
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=idr&ids=bitcoin,ethereum,dogecoin,pepe,tether";
  const res = await fetch(url);
  const data = await res.json();

  return data.map(coin => ({
    namaCoin: coin.name,
    symbol: coin.symbol.toUpperCase(),
    img: coin.image,
    harga: coin.current_price,
    persen: parseFloat(coin.price_change_percentage_24h.toFixed(2)),
    isUp: coin.price_change_percentage_24h >= 0
  }));
}

async function generateCardBySymbol(symbol) {
  const data = await getCryptoData();
  const coin = data.find(c => c.symbol === symbol);

  if (!coin) return console.error(`❌ Coin dengan simbol ${symbol} tidak ditemukan.`);

  const cardData = {
    coinName: coin.namaCoin,
    price: coin.harga,
    change: coin.persen,
    isUp: coin.isUp,
    currency: 'IDR',
    locale: 'id-ID',
    logoUrl: coin.img,
    logoText: coin.symbol
  };

  const buffer = await createCryptoCard(cardData);
  return buffer; 
}

// (async () => {
//   await generateCardBySymbol('BTC', 'bitcoin_card.png');
//   await generateCardBySymbol('ETH', 'ethereum_card.png');
//   await generateCardBySymbol('DOGE', 'dogecoin_card.png');
//   await generateCardBySymbol('PEPE', 'pepe_card.png');
//   await generateCardBySymbol('USDT', 'tether_card.png');
// })();

module.exports = generateCardBySymbol;
