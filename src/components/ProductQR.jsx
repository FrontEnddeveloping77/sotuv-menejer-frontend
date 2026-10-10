import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ProductQR = ({ product }) => {
    const [open, setOpen] = useState(false);
    const qrRef = useRef(null);

    if (!product?.qr_token) return null;

    // MUHIM: window.location.origin fallback endi ishlatilMAYDI.
    // Telefonda (ayniqsa WebView/Capacitor/PWA ilovalarda) window.location.origin
    // ko'pincha "http://localhost" ni qaytaradi, chunki ilova fayllari qurilma
    // ichidan mahalliy tarzda yuklanadi. Shu sabab QR har doim FAQAT aniq
    // belgilangan production domenga (VITE_PUBLIC_APP_URL) tayanadi.
    const PUBLIC_SITE_URL = 'https://sotuvmenejer.uz';

    const isLocalOrApp = typeof window !== 'undefined' && (
        window.location.origin.includes('localhost') ||
        window.location.origin.includes('capacitor://')
    );

    const publicBase = (
        import.meta.env.VITE_PUBLIC_APP_URL ||
        (!isLocalOrApp && typeof window !== 'undefined' ? window.location.origin : PUBLIC_SITE_URL)
    ).replace(/\/$/, '');

    const url = `${publicBase}/qr/${product.qr_token}`;

    const formatSum = (val) => {
        return Number(val || 0).toLocaleString('uz-UZ');
    };

    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = String(text || '').split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }

        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
    };

    const downloadQR = () => {
        const qrCanvas = qrRef.current;
        if (!qrCanvas) return;

        // 1 mm = 10 px
        const MM = 10;
        const pad5mm = 5 * MM; // 5 mm (50px) tashqi bo'shliq
        const border3mm = 3 * MM; // 3 mm (30px) ramka chizig'i
        const qrSize = 280; // QR kod kengligi va balandligi
        const width = qrSize + pad5mm * 2; // 380px (yon tomonlardan 5 mmdan joy)

        const rawSize = product.size != null ? String(product.size).trim() : '';
        const isSizeEmpty = !rawSize || rawSize === '-' || rawSize.toLowerCase() === 'null' || rawSize.toLowerCase() === 'undefined' || rawSize.toLowerCase() === 'standart' || rawSize.toLowerCase() === "yo'q";
        const hasSize = !isSizeEmpty;
        const sizeText = hasSize ? rawSize : '';

        const hasPrice = product.selling_price != null && product.selling_price !== '' && Number(product.selling_price) >= 0;
        const priceText = hasPrice ? `${formatSum(product.selling_price)} so'm` : '';

        // Razmer o'lchamlari (kattalashtirildi)
        const sizeFontSize = 44;
        const sizeHeight = hasSize ? Math.round(sizeFontSize * 1.15) : 0;

        // Vertikal oraliqlar
        const gapAfterQR = hasSize ? 14 : (hasPrice ? 14 : 0);
        const gapAfterSize = (hasSize && hasPrice) ? 12 : 0;

        // Narx o'lchamlarini hisoblash (uzunligi aynan QR kod kengligiga teng bo'lishi uchun)
        let priceHeight = 0;
        let optimalPriceFontSize = 36;
        if (hasPrice) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.font = 'bold 30px Arial, sans-serif';
            const measuredW = tempCtx.measureText(priceText).width;
            optimalPriceFontSize = 30 * (qrSize / (measuredW || 1));
            priceHeight = Math.round(optimalPriceFontSize * 0.95);
        }

        let contentHeight = qrSize;
        if (hasSize) {
            contentHeight += gapAfterQR + sizeHeight;
        }
        if (hasPrice) {
            contentHeight += (hasSize ? gapAfterSize : gapAfterQR) + priceHeight;
        }

        // Tepa va pastdan ham aynan 5 mm bo'shliq
        const totalHeight = pad5mm + contentHeight + pad5mm;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = totalHeight;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Oq fon
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, totalHeight);

        // 2. Hamma tomondan 3 mm uzoqlikdagi dizayn chizig'i (ramka)
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(border3mm, border3mm, width - border3mm * 2, totalHeight - border3mm * 2);

        // 3. QR kod (tepa va chapdan 5 mm masofada)
        const qrX = pad5mm;
        let currentY = pad5mm;
        ctx.drawImage(qrCanvas, qrX, currentY, qrSize, qrSize);
        currentY += qrSize;

        // 4. Razmer (kattalashtirilgan)
        if (hasSize) {
            currentY += gapAfterQR;
            ctx.font = `bold ${sizeFontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(sizeText, width / 2, currentY);
            currentY += sizeHeight;
        }

        // 5. Narx (kattalashtirilgan va uzunligi aynan QR kod uzunligi bilan teng)
        if (hasPrice) {
            currentY += (hasSize ? gapAfterSize : gapAfterQR);
            ctx.font = `bold ${optimalPriceFontSize}px Arial, sans-serif`;
            const finalMeasuredW = ctx.measureText(priceText).width;

            ctx.save();
            ctx.translate(qrX, currentY);
            // Kenglikni 100% qrSize (QR kod kengligi) ga tenglashtirish
            const scaleX = qrSize / (finalMeasuredW || 1);
            ctx.scale(scaleX, 1);
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(priceText, 0, 0);
            ctx.restore();
        }

        const pngUrl = outputCanvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${product.name || product.title || 'tovar'}-${product.local_id || product.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <>
            <button
                type="button"
                className="qr-mini-btn"
                onClick={() => setOpen(true)}
                title="QR kodni ko'rish"
            >
                ▣ QR
            </button>

            {open && (
                <div
                    className="qr-modal-overlay"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="qr-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="qr-close"
                            onClick={() => setOpen(false)}
                        >
                            ×
                        </button>

                        <h3>📱 Tovar QR kodi</h3>

                        <p>
                            <b>
                                {product.name || product.title}
                            </b>
                        </p>

                        <p className="qr-meta">
                            {product.color && String(product.color).trim() ? (
                                <> {' • '} {product.color.trim()}</>
                            ) : null}
                            {product.size && String(product.size).trim() ? (
                                <> {' • '} {product.size}</>
                            ) : null}
                            {' • '}
                            {product.quantity} dona
                            {product.selling_price != null && Number(product.selling_price) >= 0 && (
                                <>
                                    {' • '}
                                    {formatSum(product.selling_price)} so'm
                                </>
                            )}
                        </p>

                        <div
                            className="qr-canvas-wrap"
                            style={{
                                background: '#fff',
                                padding: '15px',
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '12px'
                            }}
                        >
                            <QRCodeCanvas
                                ref={qrRef}
                                value={url}
                                size={280}
                                includeMargin={false}
                                level="H"
                            />
                        </div>

                        <small className="qr-url">
                            {url}
                        </small>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                marginTop: '15px'
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={downloadQR}
                            >
                                ⬇️ QR kodni yuklab olish
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                    window.open(`/qr/${product.qr_token}`, '_blank')
                                }
                            >
                                🔗 Sahifani ochish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductQR;