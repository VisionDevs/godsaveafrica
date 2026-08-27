/* ========================================
   GSAW Membership PDF Generator
   Generates a downloadable PDF matching
   the physical membership form layout
======================================== */

// Admin portal: download PDF for a member by index
function downloadAdminMemberPDF(index) {
    var apps = getApplications();
    var app = apps[index];
    if (!app) return;

    window._lastMembershipData = {
        membershipNumber: app.membership_number || '',
        firstName: app.first_name || '',
        lastName: app.last_name || '',
        email: app.email || '',
        phone: app.phone || '',
        workPhone: app.work_phone || '',
        idNumber: app.id_number || '',
        gender: app.gender || '',
        dob: app.date_of_birth || '',
        race: app.race || '',
        languages: app.languages || '',
        address: app.address || '',
        province: app.province || '',
        municipality: app.municipality || '',
        ward: app.ward || '',
        votingStation: app.voting_station || '',
        occupation: app.occupation || '',
        qualification: app.qualification || '',
        skills: app.skills || '',
        referralSource: app.referral_source || '',
        reason: app.reason || '',
        signature: app.signature_url || '',
        status: app.status || 'pending',
        submittedAt: app.submitted_at || ''
    };

    downloadMembershipPDF();
}

function downloadMembershipPDF() {
    var data = window._lastMembershipData;
    if (!data) {
        alert('No application data found. Please submit the form first.');
        return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'mm', 'a4');
    var pageWidth = 210;
    var margin = 20;
    var contentWidth = pageWidth - margin * 2;
    var y = 15;

    // Colors
    var green = [27, 122, 61];
    var dark = [30, 30, 30];
    var gray = [100, 100, 100];
    var lightGray = [220, 220, 220];

    // ---- HEADER ----
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('GSAW', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('GOD SAVE AFRICA & THE WORLD', pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('MEMBERSHIP FORM', pageWidth / 2, y, { align: 'center' });

    // Green line under header
    y += 3;
    doc.setDrawColor(green[0], green[1], green[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);

    // ---- OFFICE DETAILS ----
    y += 7;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('16647 SHOPE STREET, GOVERN MBEKI, GQEBERHA 6001', margin, y);
    y += 4;
    doc.text('OFFICE: 078 307 8926 OR 082 422 1939  |  EMAIL: GodSaveAfricaGSAW@gmail.com', margin, y);

    // ---- PERSONAL DETAILS SECTION ----
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('PERSONAL DETAILS', margin, y);
    y += 2;
    doc.setDrawColor(green[0], green[1], green[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + 45, y);

    y += 7;
    drawField(doc, 'First Name and Surname', (data.firstName || '') + ' ' + (data.lastName || ''), margin, y, contentWidth);
    y += 12;
    drawField(doc, 'ID Number', data.idNumber || '', margin, y, contentWidth);
    y += 12;
    drawField(doc, 'Residential Address', data.address || '', margin, y, contentWidth);

    y += 12;
    var halfWidth = (contentWidth - 10) / 2;
    drawField(doc, 'Gender', data.gender || '', margin, y, halfWidth);
    drawField(doc, 'Age', calculateAge(data.dob), margin + halfWidth + 10, y, halfWidth);

    y += 12;
    drawField(doc, 'Race', data.race || '', margin, y, halfWidth);
    drawField(doc, 'Languages', data.languages || '', margin + halfWidth + 10, y, halfWidth);

    y += 12;
    drawField(doc, 'E-mail', data.email || '', margin, y, contentWidth);

    y += 12;
    drawField(doc, 'Cellphone', data.phone || '', margin, y, halfWidth);
    drawField(doc, 'Telephone (W)', data.workPhone || '', margin + halfWidth + 10, y, halfWidth);

    // ---- WHERE DID YOU HEAR ----
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Where did you hear about GSAW?', margin, y);
    y += 5;

    var referralOptions = ['Social network', 'TV/Radio', 'Newspaper', 'From a member'];
    var selectedReferrals = (data.referralSource || '').split(', ').filter(Boolean);
    var checkX = margin;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    referralOptions.forEach(function (opt) {
        var checked = selectedReferrals.indexOf(opt) !== -1;
        // Draw checkbox
        doc.setDrawColor(gray[0], gray[1], gray[2]);
        doc.setLineWidth(0.3);
        doc.rect(checkX, y - 3, 3.5, 3.5);
        if (checked) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(green[0], green[1], green[2]);
            doc.text('✓', checkX + 0.5, y - 0.2);
            doc.setFont('helvetica', 'normal');
        }
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(opt, checkX + 5, y);
        checkX += 42;
    });

    // ---- DECLARATION ----
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('DECLARATION', margin, y);
    y += 2;
    doc.setDrawColor(green[0], green[1], green[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + 30, y);

    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    var declaration = 'I hereby promise to always commit, adhere to the principles, values, discipline of the constitution of God Save Africa (GSA).';
    var declLines = doc.splitTextToSize(declaration, contentWidth);
    doc.text(declLines, margin, y);
    y += declLines.length * 4 + 4;

    // Signature
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature:', margin, y);
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.3);
    doc.line(margin + 22, y, margin + 90, y);

    // If we have signature data, draw it
    if (data.signature) {
        try {
            doc.addImage(data.signature, 'PNG', margin + 22, y - 12, 60, 14);
        } catch (e) { /* signature render failed, skip */ }
    }

    // ---- DEPOSIT DETAILS ----
    y += 14;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('DEPOSIT DETAILS', margin, y);
    y += 2;
    doc.setDrawColor(green[0], green[1], green[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + 40, y);

    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('The membership fee starts from R20. Voluntary contributions beyond this amount are sincerely appreciated.', margin, y);

    y += 8;
    var bankDetails = [
        ['Bank Name:', 'First National Bank (FNB)'],
        ['Account Name:', 'GOD SAVE AFRICA AND THE WORLD NPC'],
        ['Account Number:', '6318 1922 121'],
        ['Branch Code:', '250 655']
    ];

    bankDetails.forEach(function (row) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(row[0], margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text(row[1], margin + 35, y);
        y += 5;
    });

    // Deposit fields (empty for the user to fill)
    y += 4;
    drawField(doc, 'Date', '', margin, y, halfWidth);
    drawField(doc, 'Total Deposit (R)', '', margin + halfWidth + 10, y, halfWidth);
    y += 12;
    drawField(doc, "Depositor's Name", (data.firstName || '') + ' ' + (data.lastName || ''), margin, y, halfWidth);
    drawField(doc, 'Contact Number', data.phone || '', margin + halfWidth + 10, y, halfWidth);

    // ---- FOOTER ----
    y += 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text('ALL POWER BELONGS TO JESUS', pageWidth / 2, y, { align: 'center' });

    // Footer line
    y += 5;
    doc.setDrawColor(green[0], green[1], green[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Generated from www.gsaw.org.za | Application Ref: ' + (data.membershipNumber || 'N/A') + ' | Date: ' + (data.submittedAt || ''), pageWidth / 2, y, { align: 'center' });

    // Save
    var filename = 'GSAW-Membership-' + (data.firstName || 'Form') + '-' + (data.lastName || '') + '.pdf';
    doc.save(filename.replace(/\s+/g, '_'));
}

// Helper: draw a labeled field with underline
function drawField(doc, label, value, x, y, width) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x, y);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value || '', x, y + 5);

    // Underline
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(x, y + 6.5, x + width, y + 6.5);
}

// Helper: calculate age from DOB string
function calculateAge(dob) {
    if (!dob) return '';
    var parts = dob.split('-');
    if (parts.length !== 3) return '';
    var birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
}
