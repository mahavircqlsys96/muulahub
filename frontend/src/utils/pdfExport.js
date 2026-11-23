import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatPdfDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  } catch {
    return String(d);
  }
};

const formatAmountStr = (val, currency) => {
  const num = parseFloat(val);
  const curr = String(currency || 'USD').toUpperCase().trim();
  if (isNaN(num)) return `0.00 ${curr}`;
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
};

export const exportPaymentsToPdf = (payments, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Accent Bar
  doc.setFillColor(249, 25, 66);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Brand Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(249, 25, 66);
  doc.text('MUULAHUB', 40, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT TRANSACTIONS REPORT', 40, 60);

  // Metadata / Date on the right
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 40, 42, { align: 'right' });

  const filterParts = [];
  if (options.status) filterParts.push(`Status: ${options.status.toUpperCase()}`);
  else filterParts.push('Status: ALL');
  if (options.search) filterParts.push(`Search: "${options.search}"`);
  filterParts.push(`Total Records: ${payments.length}`);
  doc.text(filterParts.join('  |  '), pageWidth - 40, 58, { align: 'right' });

  // Summary Metrics Bar
  const stats = options.stats || {};
  const totalVolume = stats.totalVolume !== undefined
    ? stats.totalVolume
    : payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const totalCommission = stats.adminRevenue !== undefined
    ? stats.adminRevenue
    : payments.reduce((acc, p) => acc + (parseFloat(p.adminCommission) || 0), 0);
  const totalPayout = stats.providerPayout !== undefined
    ? stats.providerPayout
    : payments.reduce((acc, p) => acc + (parseFloat(p.providerAmount) || 0), 0);
  const primaryCurr = String(stats.primaryCurrency || payments[0]?.currency || 'USD').toUpperCase();

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 72, pageWidth - 80, 36, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 72, pageWidth - 80, 36, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TRANSACTIONS', 60, 86);
  doc.text('TOTAL VOLUME', 230, 86);
  doc.text('ADMIN COMMISSION', 420, 86);
  doc.text('PROVIDER PAYOUT', 620, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${payments.length}`, 60, 100);
  doc.setTextColor(249, 115, 22);
  doc.text(`${formatAmountStr(totalVolume, primaryCurr)}`, 230, 100);
  doc.setTextColor(249, 25, 66);
  doc.text(`${formatAmountStr(totalCommission, primaryCurr)}`, 420, 100);
  doc.setTextColor(16, 185, 129);
  doc.text(`${formatAmountStr(totalPayout, primaryCurr)}`, 620, 100);

  // Table Data
  const headers = [
    ['#', 'Transaction ID', 'Customer', 'Booking #', 'Currency', 'Amount', 'Commission', 'Provider Payout', 'Status', 'Date']
  ];

  const rows = payments.map((p, idx) => {
    const curr = String(p.currency || 'USD').toUpperCase();
    return [
      idx + 1,
      p.transactionId || '—',
      p.payer?.name || '—',
      p.booking?.bookingNumber ? `#${p.booking.bookingNumber}` : '—',
      curr,
      formatAmountStr(p.amount, curr),
      formatAmountStr(p.adminCommission, curr),
      formatAmountStr(p.providerAmount, curr),
      String(p.paymentStatus || '—').toUpperCase(),
      formatPdfDate(p.createdAt)
    ];
  });

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 120,
    margin: { left: 40, right: 40, bottom: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: [249, 25, 66],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 155 },
      2: { cellWidth: 90 },
      3: { cellWidth: 70 },
      4: { cellWidth: 45, halign: 'center' },
      5: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 70, halign: 'right', textColor: [220, 38, 38] },
      7: { cellWidth: 75, halign: 'right', textColor: [16, 185, 129] },
      8: { cellWidth: 55, halign: 'center' },
      9: { cellWidth: 65, halign: 'center' }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `MuulaHub Admin Payments Report  •  Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );
    }
  });

  const filename = `muulahub_payments_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

export const exportWithdrawalsToPdf = (withdrawals, options = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Accent Bar
  doc.setFillColor(249, 25, 66);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Brand Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(249, 25, 66);
  doc.text('MUULAHUB', 40, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('WITHDRAWAL REQUESTS REPORT', 40, 60);

  // Metadata / Date on the right
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 40, 42, { align: 'right' });

  const filterParts = [];
  if (options.status) filterParts.push(`Status: ${options.status.toUpperCase()}`);
  else filterParts.push('Status: ALL');
  filterParts.push(`Total Requests: ${withdrawals.length}`);
  doc.text(filterParts.join('  |  '), pageWidth - 40, 58, { align: 'right' });

  // Summary Metrics Bar
  const totalAmount = withdrawals.reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);
  const pendingCount = withdrawals.filter(w => String(w.status).toLowerCase() === 'pending').length;
  const approvedCount = withdrawals.filter(w => String(w.status).toLowerCase() === 'approved').length;
  const rejectedCount = withdrawals.filter(w => String(w.status).toLowerCase() === 'rejected').length;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 72, pageWidth - 80, 36, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 72, pageWidth - 80, 36, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL REQUESTS', 60, 86);
  doc.text('PENDING', 210, 86);
  doc.text('APPROVED', 350, 86);
  doc.text('REJECTED', 490, 86);
  doc.text('TOTAL VOLUME', 630, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${withdrawals.length}`, 60, 100);
  doc.setTextColor(202, 138, 4);
  doc.text(`${pendingCount}`, 210, 100);
  doc.setTextColor(16, 185, 129);
  doc.text(`${approvedCount}`, 350, 100);
  doc.setTextColor(220, 38, 38);
  doc.text(`${rejectedCount}`, 490, 100);
  doc.setTextColor(249, 115, 22);
  doc.text(`${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 630, 100);

  // Table Data
  const headers = [
    ['#', 'Provider', 'Email / Phone', 'Amount', 'Bank Name', 'Account Number', 'Routing / IFSC', 'Status', 'Date']
  ];

  const rows = withdrawals.map((w, idx) => {
    const bank = w.provider?.bankAccounts?.[0] || {};
    const bankName = bank.bankName || w.bankName || w.bank_name || '—';
    const accNumber = bank.accountNumber || w.accountNumber || w.account_number || '—';
    const routing = bank.routingNumber || w.ifscCode || w.ifsc_code || '—';
    const curr = String(w.provider?.currency || 'USD').toUpperCase();

    return [
      idx + 1,
      w.provider?.name || '—',
      w.provider?.email || w.provider?.phone || '—',
      formatAmountStr(w.amount, curr),
      bankName,
      accNumber,
      routing,
      String(w.status || '—').toUpperCase(),
      formatPdfDate(w.createdAt)
    ];
  });

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 120,
    margin: { left: 40, right: 40, bottom: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: [249, 25, 66],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 120 },
      3: { cellWidth: 80, halign: 'right', fontStyle: 'bold', textColor: [249, 115, 22] },
      4: { cellWidth: 95 },
      5: { cellWidth: 95 },
      6: { cellWidth: 80 },
      7: { cellWidth: 65, halign: 'center' },
      8: { cellWidth: 65, halign: 'center' }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `MuulaHub Admin Withdrawal Requests Report  •  Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );
    }
  });

  const filename = `muulahub_withdrawals_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
