import React, { useState } from 'react';
import { CompanySettings } from '../types';
import PurchaseOrderDocument from './documents/PurchaseOrderDocument';
import GoodsReceiptDocument from './documents/GoodsReceiptDocument';
import PurchaseInvoiceDocument from './documents/PurchaseInvoiceDocument';
import { DownloadIcon } from './icons/DownloadIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';

interface ViewDocumentModalProps {
    documentType: 'po' | 'grn' | 'invoice';
    documentData: any;
    companySettings: CompanySettings;
    onClose: () => void;
}

const ViewDocumentModal: React.FC<ViewDocumentModalProps> = ({ documentType, documentData, companySettings, onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const renderDocument = () => {
        switch (documentType) {
            case 'po':
                return <PurchaseOrderDocument purchaseOrder={documentData} settings={companySettings} />;
            case 'grn':
                return <GoodsReceiptDocument goodsReceipt={documentData} settings={companySettings} />;
            case 'invoice':
                return <PurchaseInvoiceDocument invoice={documentData} settings={companySettings} />;
            default:
                return <div>Invalid document type</div>;
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const element = document.getElementById('printable-document');
        const html2canvas = (window as any).html2canvas;
        const jspdf = (window as any).jspdf;

        if (!element || !html2canvas || !jspdf) {
            console.error("PDF generation failed: element or library not found.");
            setIsDownloading(false);
            return;
        }
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasAspectRatio = canvas.width / canvas.height;
            const pdfHeight = pdfWidth / canvasAspectRatio;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            let filename = 'document.pdf';
            switch (documentType) {
                case 'po':
                    filename = `PO-${documentData.poNumber}.pdf`;
                    break;
                case 'grn':
                    filename = `${documentData.id}.pdf`;
                    break;
                case 'invoice':
                    filename = `Invoice-${documentData.invoiceNumber}.pdf`;
                    break;
            }

            pdf.save(filename);

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl relative flex flex-col h-full max-h-[90vh]">
                <div className="p-4 bg-gray-900/50 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white capitalize">{documentType} Document</h2>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleDownload} 
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm disabled:bg-gray-500 disabled:cursor-wait"
                        >
                            {isDownloading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <DownloadIcon className="w-5 h-5" />}
                            {isDownloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                        <button onClick={onClose} disabled={isDownloading} className="text-gray-400 hover:text-white disabled:text-gray-600">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 bg-gray-200">
                   <div id="printable-document" className="bg-white text-gray-900 shadow-lg max-w-3xl mx-auto p-8">
                     {renderDocument()}
                   </div>
                </div>
            </div>
        </div>
    );
};

export default ViewDocumentModal;
