import React from 'react';
import { Transaction, CompanySettings } from '../types';

interface ReceiptProps {
    transaction: Transaction;
    settings: CompanySettings;
}

const formatAttributes = (attributes: Record<string, string>): string => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return '';
  return `(${entries.map(([key, value]) => value).join(', ')})`;
};

const styles: { [key: string]: React.CSSProperties } = {
    receipt: {
        width: '288px', // ~3 inches for 80mm paper
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        color: '#000',
        backgroundColor: '#fff',
        padding: '12px',
        boxSizing: 'border-box',
    },
    header: {
        textAlign: 'center',
    },
    logo: {
        width: '80px',
        margin: '0 auto 10px',
        objectFit: 'contain',
    },
    companyName: {
        fontSize: '16px',
        fontWeight: 'bold',
        margin: '0',
    },
    companyInfo: {
        fontSize: '10px',
        margin: '2px 0',
    },
    hr: {
        border: 0,
        borderTop: '1px dashed #000',
        margin: '8px 0',
    },
    infoLine: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        margin: '2px 0',
    },
    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '8px',
    },
    tableHeader: {
        borderBottom: '1px solid #000',
        paddingBottom: '4px',
        textAlign: 'left',
    },
    th: {
        fontWeight: 'bold',
    },
    itemRow: {
        padding: '4px 0',
        borderBottom: '1px dotted #ccc',
    },
    itemName: {
        fontWeight: 'bold',
        wordBreak: 'break-word',
    },
    itemDetails: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    totals: {
        marginTop: '10px',
    },
    totalLine: {
        display: 'flex',
        justifyContent: 'space-between',
        margin: '3px 0',
        fontSize: '12px',
    },
    grandTotal: {
        fontWeight: 'bold',
        fontSize: '16px',
        marginTop: '5px',
        paddingTop: '5px',
        borderTop: '1px solid #000',
    },
    footer: {
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '9px',
    },
    barcode: {
        width: '100%',
        height: '50px',
        marginTop: '10px',
        objectFit: 'contain',
    }
};

const Receipt: React.FC<ReceiptProps> = ({ transaction, settings }) => {
    return (
        <div className="printable-area">
            <div style={styles.receipt}>
                <header style={styles.header}>
                    {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" style={styles.logo} />}
                    <h2 style={styles.companyName}>{settings.name}</h2>
                    <p style={styles.companyInfo}>{settings.address}</p>
                    <p style={styles.companyInfo}>Phone: {settings.phone}</p>
                    <p style={styles.companyInfo}>KRA PIN: {settings.taxId}</p>
                </header>
                
                <hr style={styles.hr} />
                
                <section>
                    <div style={styles.infoLine}><span>Receipt No:</span><span>{transaction.id}</span></div>
                    <div style={styles.infoLine}><span>Date:</span><span>{transaction.date.toLocaleString()}</span></div>
                    <div style={styles.infoLine}><span>Cashier:</span><span>{transaction.user.name}</span></div>
                    {transaction.customer && (
                        <div style={styles.infoLine}><span>Customer:</span><span>{transaction.customer.name}</span></div>
                    )}
                </section>

                <hr style={styles.hr} />

                <section>
                    <div style={{ ...styles.infoLine, fontWeight: 'bold' }}>
                        <span>Item</span>
                        <span>Total</span>
                    </div>
                     <hr style={{...styles.hr, margin: '4px 0'}} />
                    {transaction.items.map((item, index) => (
                        <div key={index} style={styles.itemRow}>
                           <div style={styles.itemName}>{item.name} {formatAttributes(item.variantAttributes)}</div>
                            <div style={styles.itemDetails}>
                                <span>{item.quantity.toFixed(item.sellingMethod === 'Each' ? 0 : 3)}{item.sellingMethod !== 'Each' ? item.storageUom : ''} @ {item.price.toFixed(2)}</span>
                                <span>{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </section>

                <section style={styles.totals}>
                    <div style={{...styles.hr, marginTop: '8px'}} />
                    <div style={styles.totalLine}><span>Subtotal</span><span>{transaction.subtotal.toFixed(2)}</span></div>
                    <div style={styles.totalLine}><span>Tax (VAT)</span><span>{transaction.tax.toFixed(2)}</span></div>
                    <div style={{ ...styles.totalLine, ...styles.grandTotal }}><span>TOTAL</span><span>KES {transaction.total.toFixed(2)}</span></div>
                </section>
                
                <hr style={styles.hr} />

                <section>
                    {transaction.paymentMethods.map((pm, index) => (
                        <div key={index} style={styles.infoLine}><span>Paid by {pm.method}:</span><span>{pm.amount.toFixed(2)}</span></div>
                    ))}
                </section>

                <footer style={styles.footer}>
                    <p>Thank you for shopping with us!</p>
                    {transaction.id && (
                        <img
                            src={`https://barcode.tec-it.com/barcode.ashx?data=${transaction.id}&code=Code128&dpi=96`}
                            alt="Transaction Barcode"
                            style={styles.barcode}
                        />
                    )}
                    <p style={{fontSize: '9px', marginTop: '5px'}}>Powered by https://mobetposkenya.com</p>
                </footer>
            </div>
        </div>
    );
};

export default Receipt;