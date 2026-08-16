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

    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = String(text || '').split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }

        ctx.fillText(line.trim(), x, y);

        return y;
    };

    const downloadQR = () => {
        const qrCanvas = qrRef.current;

        if (!qrCanvas) return;

        /*
         * Yangi canvas:
         * yuqorida QR kod
         * pastida tovar ma'lumotlari
         */
        const outputCanvas = document.createElement('canvas');

        const width = 420;
        const qrSize = 300;
        const topPadding = 30;
        const gap = 20;
        const infoHeight = 150;

        outputCanvas.width = width;
        outputCanvas.height =
            topPadding +
            qrSize +
            gap +
            infoHeight;

        const ctx = outputCanvas.getContext('2d');

        if (!ctx) return;

        // Oq fon
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            0,
            0,
            outputCanvas.width,
            outputCanvas.height
        );

        // QR kodni markazga joylashtirish
        const qrX = (width - qrSize) / 2;

        ctx.drawImage(
            qrCanvas,
            qrX,
            topPadding,
            qrSize,
            qrSize
        );

        const centerX = width / 2;

        let textY = topPadding + qrSize + 35;

        // Tovar nomi
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial';

        textY = wrapText(
            ctx,
            `Tovar: ${product.name || product.title || "Noma'lum"}`,
            centerX,
            textY,
            width - 40,
            28
        );

        textY += 8;

        // Rang
        ctx.font = '18px Arial';

        ctx.fillText(
            `Rangi: ${product.color || "Ko'rsatilmagan"}`,
            centerX,
            textY
        );

        textY += 28;

        // ID
        ctx.font = 'bold 18px Arial';

        ctx.fillText(
            `ID: #${product.local_id || product.id}`,
            centerX,
            textY
        );

        textY += 26;

        // Razmer
        if (product.size) {
            ctx.font = '16px Arial';

            ctx.fillText(
                `Razmer: ${product.size}`,
                centerX,
                textY
            );
        }

        const pngUrl = outputCanvas.toDataURL('image/png');

        const downloadLink =
            document.createElement('a');

        downloadLink.href = pngUrl;

        downloadLink.download =
            `QR-${product.name || product.title || 'tovar'}-${product.local_id || product.id}.png`;

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
                                    window.open(
                                        url,
                                        '_blank'
                                    )
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