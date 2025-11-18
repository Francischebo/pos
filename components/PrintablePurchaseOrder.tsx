import React from 'react';
import { PurchaseOrder, CompanySettings } from '../types';
import PurchaseOrderDocument from './documents/PurchaseOrderDocument';

interface PrintablePurchaseOrderProps {
    purchaseOrder: PurchaseOrder;
    settings: CompanySettings;
}

const PrintablePurchaseOrder: React.FC<PrintablePurchaseOrderProps> = ({ purchaseOrder, settings }) => {
    // This component renders an off-screen, A4-sized container for accurate PDF generation.
    // The styles ensure html2canvas captures a well-formatted document.
    return (
        <div style={{
            position: 'fixed',
            left: '-9999px', // Position off-screen
            top: '0',
            zIndex: -1,
        }}>
            <div id="printable-po" style={{
                width: '210mm', // A4 width
                minHeight: '297mm', // A4 height, use min-height to allow content to grow
                padding: '20mm', // Standard margins
                backgroundColor: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                fontFamily: `'Inter', sans-serif`,
            }}>
                <PurchaseOrderDocument purchaseOrder={purchaseOrder} settings={settings} />
            </div>
        </div>
    );
};

export default PrintablePurchaseOrder;