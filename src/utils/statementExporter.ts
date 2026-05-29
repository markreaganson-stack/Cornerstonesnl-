import { jsPDF } from 'jspdf';
import { Loan } from '../types';

/**
 * Generates an elegant corporate PDF file representing the customer's account statement & schedule summary.
 */
export function exportLoanStatementPDF(
  loan: Loan,
  balanceRemaining: number,
  totalInterestPaid: number,
  totalRepayAmount: number
) {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width || 210;
    const pageHeight = doc.internal.pageSize.height || 297;
    let currentY = 15;

    // --- Elegant Header Banner ---
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(10, currentY, pageWidth - 20, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CORNERSTONE SAVINGS & LOANS', 15, currentY + 10);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('OFFICIAL STATEMENT OF ACCOUNT & REPAYMENT SCHEDULING', 15, currentY + 16);

    // Right-aligned header info
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GHC ACCREDITED', pageWidth - 15 - 32, currentY + 10);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, pageWidth - 15 - 32, currentY + 16);

    currentY += 32;

    // --- Customer Overview Summary and Info Cards ---
    // User Profile Information
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.roundedRect(10, currentY, 90, 42, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CLIENT PROFILE', 14, currentY + 6);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY + 8, 96, currentY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Name:', 14, currentY + 15);
    doc.setFont('Helvetica', 'normal');
    doc.text(loan.borrowerName, 32, currentY + 15);

    doc.setFont('Helvetica', 'bold');
    doc.text('ID Reference:', 14, currentY + 21);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(loan.id, 38, currentY + 21);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Email Info:', 14, currentY + 27);
    doc.setFont('Helvetica', 'normal');
    doc.text(loan.borrowerEmail || 'No Email Added', 34, currentY + 27);

    doc.setFont('Helvetica', 'bold');
    doc.text('Contact Spec:', 14, currentY + 33);
    doc.setFont('Helvetica', 'normal');
    doc.text(loan.borrowerContact, 38, currentY + 33);

    doc.setFont('Helvetica', 'bold');
    doc.text('Status:', 14, currentY + 39);
    doc.setFont('Helvetica', 'bold');
    if (loan.status === 'paid') {
      doc.setTextColor(16, 185, 129); // green
      doc.text('Fully Settled', 28, currentY + 39);
    } else if (loan.status === 'overdue') {
      doc.setTextColor(239, 68, 68); // red
      doc.text('Overdue Action Required', 28, currentY + 39);
    } else {
      doc.setTextColor(79, 70, 229); // indigo
      doc.text(loan.status.toUpperCase(), 28, currentY + 39);
    }

    // Account Summary Statistics
    doc.setTextColor(15, 23, 42); 
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(105, currentY, 95, 42, 2, 2, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FINANCIAL OVERVIEW', 109, currentY + 6);
    doc.line(109, currentY + 8, 196, currentY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Total Principal Lent:', 109, currentY + 15);
    doc.setFont('Helvetica', 'normal');
    doc.text(`GHc ${loan.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 152, currentY + 15);

    doc.setFont('Helvetica', 'bold');
    doc.text('Total Scheduled Cost:', 109, currentY + 21);
    doc.setFont('Helvetica', 'normal');
    doc.text(`GHc ${totalRepayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 152, currentY + 21);

    doc.setFont('Helvetica', 'bold');
    doc.text('Cumulative Amount Paid:', 109, currentY + 27);
    doc.setFont('Helvetica', 'normal');
    doc.text(`GHc ${totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 152, currentY + 27);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text('Active Outstanding Bal:', 109, currentY + 33);
    doc.setFont('Helvetica', 'bold');
    doc.text(`GHc ${balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 152, currentY + 33);

    doc.setTextColor(15, 23, 42); // Reset
    doc.setFont('Helvetica', 'bold');
    doc.text('Amortization Model:', 109, currentY + 39);
    doc.setFont('Helvetica', 'normal');
    const modelStr = `${loan.interestRate}% ${loan.interestType} (${loan.paymentFrequency})`;
    doc.text(modelStr.toUpperCase(), 148, currentY + 39);

    currentY += 49;

    // --- Schedule Table Section ---
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`AMORTIZATION REPAYMENT LEDGER SCHEDULE (${loan.schedule.length} INSTALLMENTS)`, 10, currentY);
    currentY += 4;

    // Draw Table Header Banner
    doc.setFillColor(71, 85, 105); // Slate-600
    doc.rect(10, currentY, pageWidth - 20, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('No.', 13, currentY + 5.5);
    doc.text('Due Date', 25, currentY + 5.5);
    doc.text('Installment Total', 53, currentY + 5.5);
    doc.text('Principal Paid', 90, currentY + 5.5);
    doc.text('Interest Fee', 127, currentY + 5.5);
    doc.text('Current Standing Status', 158, currentY + 5.5);

    currentY += 8;

    // Draw Table Rows
    doc.setFontSize(7.5);
    let rowAltFlag = false;

    for (let i = 0; i < loan.schedule.length; i++) {
      const row = loan.schedule[i];

      // Move to a new page if we exceed page height boundaries
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 15;

        // Draw header on new page
        doc.setFillColor(71, 85, 105);
        doc.rect(10, currentY, pageWidth - 20, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text('No.', 13, currentY + 5.5);
        doc.text('Due Date', 25, currentY + 5.5);
        doc.text('Installment Total', 53, currentY + 5.5);
        doc.text('Principal Paid', 90, currentY + 5.5);
        doc.text('Interest Fee', 127, currentY + 5.5);
        doc.text('Current Standing Status', 158, currentY + 5.5);
        currentY += 8;
      }

      // Draw light grey background for alternating rows
      if (rowAltFlag) {
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(10, currentY, pageWidth - 20, 6.5, 'F');
      }
      rowAltFlag = !rowAltFlag;

      doc.setTextColor(30, 41, 59); // Slate-800
      doc.setFont('Helvetica', 'normal');
      doc.text(`#${row.paymentNumber}`, 14, currentY + 4.5);
      doc.text(row.dueDate, 25, currentY + 4.5);
      doc.text(`GHc ${row.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 53, currentY + 4.5);
      doc.text(`GHc ${row.principalPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 90, currentY + 4.5);
      doc.text(`GHc ${row.interestPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 127, currentY + 4.5);

      // Print status with colors
      if (row.isPaid) {
        doc.setTextColor(16, 185, 129); // green
        doc.setFont('Helvetica', 'bold');
        const payDate = row.paidDetails?.paymentDate ? ` (${row.paidDetails.paymentDate})` : '';
        doc.text(`PAID${payDate}`, 158, currentY + 4.5);
      } else {
        const isPastDue = new Date(row.dueDate) < new Date();
        if (isPastDue) {
          doc.setTextColor(239, 68, 68); // red
          doc.setFont('Helvetica', 'bold');
          doc.text('PAST DUE / UNPAID', 158, currentY + 4.5);
        } else {
          doc.setTextColor(100, 116, 139); // slate grey
          doc.setFont('Helvetica', 'normal');
          doc.text('PENDING OUTSTANDING', 158, currentY + 4.5);
        }
      }

      // Bottom grid separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(10, currentY + 6.5, pageWidth - 10, currentY + 6.5);

      currentY += 6.5;
    }

    currentY += 10;

    // Verify page boundary for footer content
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 15;
    }

    // --- Footer Notice & Agreement Terms ---
    doc.setDrawColor(226, 232, 240);
    doc.line(10, currentY, pageWidth - 10, currentY);
    currentY += 4;

    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    const notesText = "DISCLAIMER NOTICE: This schedule is dynamically assembled matching reducing-balance simple or compounded formulas. This represents real-time data from Cornerstone Savings & Loans Local Records. Contact finance@cornerstonesnl.com for any settlement disputes or administrative feedback.";
    const splitNotes = doc.splitTextToSize(notesText, pageWidth - 20);
    doc.text(splitNotes, 10, currentY);

    currentY += 12;

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CORNERSTONE SAVINGS & LOANS RECONCILIATION TERMINAL SYSTEM', 10, currentY);

    // Save File Outbound Flow
    const fileName = `Statement_${loan.borrowerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Triggers an HTTP post dispatch request to send the Customer Statement via SMTP mail.
 */
export async function sendLoanStatementEmail(
  loan: Loan,
  recipientEmail: string,
  balanceRemaining: number,
  totalInterestPaid: number,
  totalRepayAmount: number
): Promise<{ success: boolean; message: string; relay?: string }> {
  const subject = `📊 Account Statement Summary: ${loan.borrowerName} (${loan.loanName})`;

  const schedulePreview = loan.schedule.map(row => {
    const statusText = row.isPaid 
      ? `PAID on ${row.paidDetails?.paymentDate || 'N/A'}` 
      : (new Date(row.dueDate) < new Date() ? '❌ PAST DUE / OUTSTANDING' : '⏳ Pending');
    return `   Instalment #${row.paymentNumber} / Due: ${row.dueDate} / Amount: GHc ${row.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} / Status: ${statusText}`;
  }).join('\n');

  const textMessage = `
Dear ${loan.borrowerName},

Here is your updated Digital Account Statement & Amortization Schedule from Cornerstone Savings & Loans GHC Portal.

___________________________________________________________
1. FINANCIAL SUMMARY OVERVIEW
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
• Borrower Full Name:       ${loan.borrowerName}
• Registered Account Code:   ${loan.id}
• Loan Agreement:           ${loan.loanName} [${loan.category.toUpperCase()} category]
• Interest Framework:       ${loan.interestRate}% yearly rate via ${loan.interestType} model
• Original Principal:       GHc ${loan.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Total Scheduled Cost:     GHc ${totalRepayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Cumulative Paid To-Date:  GHc ${totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Active Outstanding Bal:   GHc ${balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Status Standing:          ${loan.status.toUpperCase()}

___________________________________________________________
2. CHRONOLOGICAL REPAYMENT SCHEDULE DETAILS
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
${schedulePreview}

___________________________________________________________
3. ACCOUNT SERVICE NOTICE
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
Your alerts framework is active. Standard reminders will dispatch email/SMS matches relative to outstanding payments. For support, please contact customer relations at: finance@cornerstonesnl.com.

Thank you,
Cornerstone Savings & Loans Reconciliation Terminal
Accra, Ghana
`;

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        message: textMessage
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned error status code: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Statement successfully dispatched over carrier pipeline.',
      relay: data.relay
    };
  } catch (error: any) {
    console.error('Failed to dispatch customer summary email:', error);
    return {
      success: false,
      message: error?.message || 'SMTP network interface connection timed out.'
    };
  }
}
