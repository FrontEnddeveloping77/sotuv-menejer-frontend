import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ProductQR = ({ product }) => {
    const [open, setOpen] = useState(false);
    const qrRef = useRef(null);

    if (!product?.qr_token) return null;

    const publicBase = (
        import.meta.env.VITE_PUBLIC_APP_URL ||
        window.location.origin
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

        const width = 440;
        const qrSize = 280;
        const topPadding = 28;
        const sidePadding = 24;
        const gap = 22;
        const lineHeight = 26;

        // Matn qatorlarini oldindan hisoblaymiz
        const lines = [];
        lines.push(`Tovar: ${product.name || product.title || "Noma'lum"}`);
        lines.push(`Rangi: ${product.color || "Ko'rsatilmagan"}`);
        if (product.size) {
            lines.push(`Razmer: ${product.size}`);
        }
        if (product.selling_price != null && product.selling_price !== '' && Number(product.selling_price) >= 0) {
            lines.push(`${formatSum(product.selling_price)} so'm`);
        }

        // Taxminiy matn balandligi
        const infoHeight = lines.length * lineHeight + 30;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = topPadding + qrSize + gap + infoHeight + 20;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        // Oq fon
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        // QR kodni markazga
        const qrX = (width - qrSize) / 2;
        ctx.drawImage(qrCanvas, qrX, topPadding, qrSize, qrSize);

        // Matnlar
        const centerX = width / 2;
        let textY = topPadding + qrSize + gap + 8;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';

        // Tovar nomi
        ctx.font = 'bold 20px Arial, sans-serif';
        textY = wrapText(
            ctx,
            lines[0],
            centerX,
            textY,
            width - sidePadding * 2,
            26
        );

        textY += 6;

        // Qolgan qatorlar
        ctx.font = '16px Arial, sans-serif';
        for (let i = 1; i < lines.length; i++) {
            // Sotilish narxi qalinroq
            if (lines[i].startsWith('Sotilish narxi')) {
                ctx.font = 'bold 17px Arial, sans-serif';
                ctx.fillStyle = '#0f766e';
            } else {
                ctx.font = '16px Arial, sans-serif';
                ctx.fillStyle = '#111827';
            }

            textY = wrapText(
                ctx,
                lines[i],
                centerX,
                textY,
                width - sidePadding * 2,
                lineHeight
            );
            textY += 4;
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
                            ID: #{product.local_id || product.id}
                            {' • '}
                            Rangi: {product.color || "Yo'q"}
                            {' • '}
                            {product.size || 'Standart'}
                            {' • '}
                            {product.quantity} dona
                            {product.selling_price != null && Number(product.selling_price) >= 0 && (
                                <>
                                    {' • '}
                                    Sotilish: {formatSum(product.selling_price)} so'm
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
                                size={260}
                                includeMargin={true}
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
                                    window.open(url, '_blank')
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
