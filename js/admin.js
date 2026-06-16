/* ========================================
   GSAW Admin Panel - JavaScript
   Handles: Navigation, Data Display, Approval, Export
======================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ========================================
    // 1. SIDEBAR NAVIGATION
    // ========================================
    var navItems = document.querySelectorAll('.nav-item[data-view]');
    var views = document.querySelectorAll('.view');
    var pageTitle = document.getElementById('page-title');
    var menuToggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');

    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            var viewId = this.getAttribute('data-view');
            switchView(viewId);
            // Close mobile sidebar
            sidebar.classList.remove('open');
        });
    });

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Initial load
    refreshData();
    populateProvinceFilter();
});

// ========================================
// 2. VIEW SWITCHING
// ========================================
function switchView(viewId) {
    var navItems = document.querySelectorAll('.nav-item[data-view]');
    var views = document.querySelectorAll('.view');
    var pageTitle = document.getElementById('page-title');

    var titles = {
        dashboard: 'Dashboard',
        applications: 'All Applications',
        approved: 'Approved Members',
        provinces: 'Members by Province',
        donations: 'Donations (Treasurer)'
    };

    navItems.forEach(function (item) {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        }
    });

    views.forEach(function (view) {
        view.classList.remove('active');
    });

    var targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');

    pageTitle.textContent = titles[viewId] || 'Dashboard';

    // Refresh data for the view
    if (viewId === 'applications') renderApplications();
    if (viewId === 'approved') renderApproved();
    if (viewId === 'provinces') renderProvinces();
    if (viewId === 'donations') renderDonations();
}

// ========================================
// 3. DATA HELPERS (Google Sheets + localStorage fallback)
// ========================================
// ========================================
// DATA LAYER (Supabase)
// ========================================
var cachedApplications = [];
var cachedDonations = [];

function getApplications() {
    return cachedApplications;
}

function getDonations() {
    return cachedDonations;
}

function fetchApplicationsFromSheet() {
    return gsawDB.getMemberships().then(function (data) {
        if (Array.isArray(data)) {
            cachedApplications = data;
            return data;
        }
        return cachedApplications;
    }).catch(function () {
        return cachedApplications;
    });
}

function fetchDonationsFromSheet() {
    return gsawDB.getDonations().then(function (data) {
        if (Array.isArray(data)) {
            cachedDonations = data;
            return data;
        }
        return cachedDonations;
    }).catch(function () {
        return cachedDonations;
    });
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
}

function formatPhone(phone) {
    var clean = String(phone || '').replace(/[\s\-()]/g, '');
    if (!clean.startsWith('+')) {
        clean = '+27' + clean.replace(/^0/, '');
    }
    return clean;
}

// ========================================
// 4. REFRESH DATA (Dashboard)
// ========================================
function refreshData() {
    var btn = document.getElementById('btn-refresh');
    if (btn) {
        btn.disabled = true;
        btn.querySelector('i').className = 'fas fa-sync-alt fa-spin';
        btn.querySelector('span').textContent = 'Refreshing...';
    }

    // Fetch from Google Sheets first, then render
    var p1 = fetchApplicationsFromSheet().then(function (apps) {
        renderDashboard(apps);
        renderApplications();
        renderApproved();
    });
    var p2 = fetchDonationsFromSheet().then(function () {
        refreshDonationStats();
        renderDonations();
    });

    Promise.all([p1, p2]).then(function () {
        if (btn) {
            btn.disabled = false;
            btn.querySelector('i').className = 'fas fa-sync-alt';
            btn.querySelector('span').textContent = 'Refresh';
        }
    }).catch(function () {
        if (btn) {
            btn.disabled = false;
            btn.querySelector('i').className = 'fas fa-sync-alt';
            btn.querySelector('span').textContent = 'Refresh';
        }
    });
}

function renderDashboard(apps) {
    var total = apps.length;
    var pending = apps.filter(function (a) { return a.status !== 'approved'; }).length;
    var approved = apps.filter(function (a) { return a.status === 'approved'; }).length;

    var provinces = {};
    apps.forEach(function (a) {
        if (a.province) provinces[a.province] = true;
    });
    var provinceCount = Object.keys(provinces).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-provinces').textContent = provinceCount;

    // Recent applications (last 5)
    renderRecent(apps.slice(-5).reverse());

    // Province chart
    renderProvinceChart(apps);
}

// ========================================
// 5. RECENT APPLICATIONS (Dashboard)
// ========================================
function renderRecent(apps) {
    var container = document.getElementById('recent-applications');

    if (apps.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No applications yet</p><small>Share the website to start receiving membership applications</small></div>';
        return;
    }

    var html = '<table><thead><tr><th>Name</th><th>Province</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    apps.forEach(function (app, i) {
        var allApps = getApplications();
        var realIndex = 0;
        for (var j = 0; j < allApps.length; j++) {
            if (allApps[j].id === app.id) {
                realIndex = j;
                break;
            }
        }

        var status = app.status || 'pending';
        var firstName = app.first_name || app.firstName || '';
        var lastName = app.last_name || app.lastName || '';
        var submittedAt = app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : '';

        html += '<tr>';
        html += '<td><strong>' + escapeHtml(firstName + ' ' + lastName) + '</strong></td>';
        html += '<td>' + escapeHtml(app.province || 'N/A') + '</td>';
        html += '<td><small>' + escapeHtml(submittedAt) + '</small></td>';
        html += '<td><span class="status-badge status-' + status + '">' + status + '</span></td>';
        html += '<td class="action-btns">';
        html += '<button class="btn-sm btn-view" onclick="viewApplication(' + realIndex + ')"><i class="fas fa-eye"></i></button>';
        if (status === 'pending') {
            html += '<button class="btn-sm btn-approve" onclick="approveApplication(' + realIndex + ')"><i class="fas fa-check"></i></button>';
        }
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========================================
// 6. PROVINCE CHART (Dashboard)
// ========================================
function renderProvinceChart(apps) {
    var container = document.getElementById('province-chart');
    var allProvinces = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

    var counts = {};
    allProvinces.forEach(function (p) { counts[p] = 0; });
    apps.forEach(function (a) {
        if (a.province && counts.hasOwnProperty(a.province)) {
            counts[a.province]++;
        }
    });

    var max = Math.max.apply(null, Object.values(counts)) || 1;

    var html = '';
    allProvinces.forEach(function (province) {
        var count = counts[province];
        var width = (count / max) * 100;
        html += '<div class="province-bar">';
        html += '<span class="province-name">' + province + '</span>';
        html += '<div class="province-track"><div class="province-fill" style="width:' + width + '%"></div></div>';
        html += '<span class="province-count">' + count + '</span>';
        html += '</div>';
    });

    container.innerHTML = html || '<div class="empty-state"><p>No data yet</p></div>';
}

// ========================================
// 7. ALL APPLICATIONS VIEW
// ========================================
function renderApplications() {
    var container = document.getElementById('applications-table');
    var apps = getApplications();
    var statusFilter = document.getElementById('filter-status').value;
    var provinceFilter = document.getElementById('filter-province').value;

    // Filter
    var filtered = apps.filter(function (app, i) {
        if (statusFilter !== 'all' && (app.status || 'pending') !== statusFilter) return false;
        if (provinceFilter !== 'all' && app.province !== provinceFilter) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No applications match your filters</p></div>';
        return;
    }

    var html = '<table><thead><tr><th>Membership #</th><th>Name</th><th>Email</th><th>Phone</th><th>Province</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    filtered.forEach(function (app) {
        // Find real index by ID
        var realIndex = 0;
        for (var j = 0; j < apps.length; j++) {
            if (apps[j].id === app.id) {
                realIndex = j;
                break;
            }
        }

        var status = app.status || 'pending';
        var phone = formatPhone(app.phone);
        var firstName = app.first_name || app.firstName || '';
        var lastName = app.last_name || app.lastName || '';
        var membershipNum = app.membership_number || app.membershipNumber || 'Pending';
        var submittedAt = app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : '';

        html += '<tr>';
        html += '<td><strong style="color:#1B7A3D; font-size:0.8rem;">' + escapeHtml(membershipNum) + '</strong></td>';
        html += '<td><strong>' + escapeHtml(firstName + ' ' + lastName) + '</strong></td>';
        html += '<td><small>' + escapeHtml(app.email || '') + '</small></td>';
        html += '<td>' + escapeHtml(app.phone || '') + '</td>';
        html += '<td>' + escapeHtml(app.province || '') + '</td>';
        html += '<td><small>' + escapeHtml(submittedAt) + '</small></td>';
        html += '<td><span class="status-badge status-' + status + '">' + status + '</span></td>';
        html += '<td class="action-btns">';
        html += '<button class="btn-sm btn-view" onclick="viewApplication(' + realIndex + ')" title="View Details"><i class="fas fa-eye"></i></button>';
        if (status === 'pending') {
            html += '<button class="btn-sm btn-approve" onclick="approveApplication(' + realIndex + ')" title="Approve"><i class="fas fa-check"></i> Approve</button>';
        }
        html += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========================================
// 8. APPROVED MEMBERS VIEW
// ========================================
function renderApproved() {
    var container = document.getElementById('approved-table');
    var apps = getApplications();
    var approved = apps.filter(function (a) { return a.status === 'approved'; });

    document.getElementById('approved-badge').textContent = approved.length;

    if (approved.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-check"></i><p>No approved members yet</p><small>Approve pending applications from the Applications view</small></div>';
        return;
    }

    var html = '<table><thead><tr><th>Name</th><th>Membership #</th><th>Phone (WhatsApp)</th><th>Province</th><th>Municipality</th><th>Skills</th><th>Actions</th></tr></thead><tbody>';

    approved.forEach(function (app) {
        var firstName = app.first_name || app.firstName || '';
        var lastName = app.last_name || app.lastName || '';
        var membershipNum = app.membership_number || app.membershipNumber || 'N/A';
        var phone = formatPhone(app.phone);
        var whatsappMsg = encodeURIComponent('Hi ' + firstName + '! 👋\n\nThis is a follow-up from GSAW.\n\nYour Membership Number: *' + membershipNum + '*\n\n📌 Join our Members Group: https://chat.whatsapp.com/IcZAlYCUtvi640wi2rin3o\n\nGod bless!\n#AllPowerBelongsToJesus');

        html += '<tr>';
        html += '<td><strong>' + escapeHtml(firstName + ' ' + lastName) + '</strong><br><small>' + escapeHtml(app.email || '') + '</small></td>';
        html += '<td><strong style="color:#1B7A3D;">' + escapeHtml(membershipNum) + '</strong></td>';
        html += '<td>' + escapeHtml(app.phone || '') + '</td>';
        html += '<td>' + escapeHtml(app.province || '') + '</td>';
        html += '<td>' + escapeHtml(app.municipality || '') + '</td>';
        html += '<td><small>' + escapeHtml(app.skills || 'Not specified') + '</small></td>';
        html += '<td class="action-btns">';
        html += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '?text=' + whatsappMsg + '" target="_blank"><i class="fab fa-whatsapp"></i> Message</a>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========================================
// 9. PROVINCES VIEW
// ========================================
function renderProvinces() {
    var container = document.getElementById('province-details');
    var apps = getApplications();
    var allProvinces = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

    var html = '';

    allProvinces.forEach(function (province) {
        var members = apps.filter(function (a) { return a.province === province; });
        var approved = members.filter(function (a) { return a.status === 'approved'; }).length;

        html += '<div class="province-bar" style="padding:15px 20px;">';
        html += '<span class="province-name" style="width:150px;">' + province + '</span>';
        html += '<span style="flex:1; font-size:0.82rem; color:#6c757d;">Total: <strong>' + members.length + '</strong> | Approved: <strong>' + approved + '</strong></span>';
        html += '</div>';
    });

    container.innerHTML = html;
}

// ========================================
// 10. VIEW APPLICATION DETAIL (Modal)
// ========================================
function viewApplication(index) {
    var apps = getApplications();
    var app = apps[index];
    if (!app) return;

    var body = document.getElementById('modal-body');
    var footer = document.getElementById('modal-footer');

    var fields = [
        { label: 'Membership #', value: app.membership_number || 'Pending Approval' },
        { label: 'First Name', value: app.first_name || '' },
        { label: 'Last Name', value: app.last_name || '' },
        { label: 'Email', value: app.email || '' },
        { label: 'Phone', value: app.phone || '' },
        { label: 'ID Number', value: app.id_number || '' },
        { label: 'Gender', value: app.gender || 'Not specified' },
        { label: 'Date of Birth', value: app.date_of_birth || 'Not specified' },
        { label: 'Address', value: app.address || 'Not specified' },
        { label: 'Province', value: app.province || '' },
        { label: 'Municipality', value: app.municipality || '' },
        { label: 'Ward', value: app.ward || 'Not specified' },
        { label: 'Voting Station', value: app.voting_station || 'Not specified' },
        { label: 'Occupation', value: app.occupation || 'Not specified' },
        { label: 'Qualification', value: app.qualification || 'Not specified' },
        { label: 'Skills', value: app.skills || 'Not specified' },
        { label: 'Reason', value: app.reason || 'Not specified' },
        { label: 'Status', value: app.status || 'pending' },
        { label: 'Submitted', value: app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'N/A' },
        { label: 'Approved', value: app.approved_at ? new Date(app.approved_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'Not yet' }
    ];

    var html = '';
    fields.forEach(function (f) {
        html += '<div class="detail-row"><span class="detail-label">' + f.label + '</span><span class="detail-value">' + escapeHtml(String(f.value || '')) + '</span></div>';
    });

    body.innerHTML = html;

    // Footer actions
    var status = app.status || 'pending';
    var phone = formatPhone(app.phone || '');
    var footerHtml = '';

    if (status === 'pending') {
        footerHtml += '<button class="btn-sm btn-approve" onclick="approveApplication(' + index + '); closeModal();"><i class="fas fa-check"></i> Approve</button>';
    }
    footerHtml += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>';
    footerHtml += '<button class="btn-sm btn-danger" onclick="removeApplication(' + index + '); closeModal();"><i class="fas fa-trash"></i> Remove</button>';

    footer.innerHTML = footerHtml;

    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

// ========================================
// 11. APPROVE APPLICATION
// ========================================
function approveApplication(index) {
    var apps = getApplications();
    var app = apps[index];
    if (!app) return;

    // Generate membership number if not already assigned
    var membershipNumber = app.membership_number;
    if (!membershipNumber) {
        var year = new Date().getFullYear().toString().slice(-2);
        var approvedCount = apps.filter(function (a) { return a.status === 'approved'; }).length + 1;
        membershipNumber = 'GSAW-' + year + '-' + ('0000' + approvedCount).slice(-4);
    }

    var approvedAt = new Date().toISOString();

    // Update in Supabase
    gsawDB.updateMembership(app.id, {
        status: 'approved',
        approved_at: approvedAt,
        membership_number: membershipNumber
    }).then(function () {
        // Update local cache
        apps[index].status = 'approved';
        apps[index].approved_at = approvedAt;
        apps[index].membership_number = membershipNumber;
        cachedApplications = apps;

        renderApplications();
        renderApproved();
        renderDashboard(apps);

        // Open WhatsApp with welcome message
        var phone = formatPhone(app.phone);
        var firstName = app.first_name || app.firstName || '';
        var lastName = app.last_name || app.lastName || '';
        var province = app.province || '';
        var municipality = app.municipality || '';

        var welcomeMsg = 'Dear ' + firstName + ' ' + lastName + ',\n\n' +
            '🎉 *CONGRATULATIONS!*\n\n' +
            'Your membership application to *God Save Africa & The World (GSAW)* has been *APPROVED*.\n\n' +
            '📋 *Your Membership Details:*\n' +
            '• Membership Number: *' + membershipNumber + '*\n' +
            '• Province: ' + province + '\n' +
            '• Municipality: ' + municipality + '\n' +
            '• Date Approved: ' + new Date(approvedAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) + '\n\n' +
            '👉 *Join the GSAW Members WhatsApp Group:*\n' +
            'https://chat.whatsapp.com/IcZAlYCUtvi640wi2rin3o\n\n' +
            '📌 *Next Steps:*\n' +
            '1. Join the group above\n' +
            '2. Your branch leader will contact you regarding membership fees\n' +
            '3. Start participating in your branch activities\n\n' +
            'Welcome to the family! Together we serve under God.\n\n' +
            '*#AllPowerBelongsToJesus*\n' +
            '— GSAW National Office';

        var whatsappUrl = 'https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(welcomeMsg);
        window.open(whatsappUrl, '_blank');
    });
}

// ========================================
// 12. REMOVE APPLICATION
// ========================================
function removeApplication(index) {
    if (!confirm('Are you sure you want to remove this application?')) return;
    var apps = getApplications();
    var removed = apps[index];
    if (!removed) return;

    gsawDB.deleteMembership(removed.id).then(function () {
        cachedApplications.splice(index, 1);
        refreshData();
        renderApplications();
        renderApproved();
    });
}

// ========================================
// 13. EXPORT TO CSV
// ========================================
function exportCSV() {
    var apps = getApplications();
    if (apps.length === 0) {
        alert('No applications to export.');
        return;
    }

    var headers = ['Membership #', 'First Name', 'Last Name', 'Email', 'Phone', 'ID Number', 'Gender', 'DOB', 'Address', 'Province', 'Municipality', 'Ward', 'Voting Station', 'Occupation', 'Qualification', 'Skills', 'Reason', 'Status', 'Submitted At', 'Approved At'];
    var csv = headers.join(',') + '\n';

    apps.forEach(function (app) {
        var row = [
            app.membership_number || '', app.first_name || '', app.last_name || '', app.email || '', app.phone || '',
            app.id_number || '', app.gender || '', app.date_of_birth || '', app.address || '',
            app.province || '', app.municipality || '', app.ward || '', app.voting_station || '',
            app.occupation || '', app.qualification || '', app.skills || '', (app.reason || '').replace(/"/g, '""'),
            app.status || 'pending', app.submitted_at || '', app.approved_at || ''
        ];
        csv += row.map(function (val) { return '"' + String(val) + '"'; }).join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'gsaw_members_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
}

// ========================================
// 14. POPULATE PROVINCE FILTER
// ========================================
function populateProvinceFilter() {
    var select = document.getElementById('filter-province');
    if (!select) return;

    var provinces = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];
    provinces.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
}

// ========================================
// 15. DONATIONS - DATA HELPERS
// ========================================

function refreshDonationStats() {
    var donations = getDonations();
    var count = donations.length;
    var total = 0;
    var verified = 0;

    donations.forEach(function (d) {
        var amt = parseFloat(d.amount) || 0;
        total += amt;
        if (d.status === 'verified') verified++;
    });

    // Dashboard stats
    var countEl = document.getElementById('stat-donations-count');
    var totalEl = document.getElementById('stat-donations-total');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = 'R' + total.toLocaleString('en-ZA');

    // Donations view stats
    var donCountEl = document.getElementById('stat-don-count');
    var donTotalEl = document.getElementById('stat-don-total');
    var donVerifiedEl = document.getElementById('stat-don-verified');
    if (donCountEl) donCountEl.textContent = count;
    if (donTotalEl) donTotalEl.textContent = 'R' + total.toLocaleString('en-ZA');
    if (donVerifiedEl) donVerifiedEl.textContent = verified;
}

// ========================================
// 16. RENDER DONATIONS TABLE
// ========================================
function renderDonations() {
    var container = document.getElementById('donations-table');
    if (!container) return;

    var donations = getDonations();
    var statusFilter = document.getElementById('filter-donation-status').value;

    var filtered = donations.filter(function (d) {
        if (statusFilter === 'all') return true;
        return (d.status || 'pending') === statusFilter;
    });

    refreshDonationStats();

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>No donations recorded yet</p><small>Donations submitted on the website will appear here</small></div>';
        return;
    }

    var html = '<table><thead><tr><th>Donor</th><th>Type</th><th>Amount</th><th>Purpose</th><th>Email</th><th>Phone</th><th>POP</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    filtered.forEach(function (donation, i) {
        // Find real index
        var realIndex = donations.indexOf(donation);
        for (var j = 0; j < donations.length; j++) {
            if (donations[j].id === donation.id) {
                realIndex = j;
                break;
            }
        }

        var status = (donation.status || 'pending').toString();
        var name = escapeHtml(donation.donor_name || ((donation.first_name || '') + ' ' + (donation.last_name || '')).trim() || 'Unknown');
        var amount = donation.amount ? 'R' + parseFloat(donation.amount).toLocaleString('en-ZA') : 'N/A';

        html += '<tr>';
        html += '<td><strong>' + name + '</strong></td>';
        html += '<td><small>' + escapeHtml(donation.donor_type || 'individual') + '</small></td>';
        html += '<td><strong style="color:#f47920;">' + amount + '</strong></td>';
        html += '<td><small>' + escapeHtml(donation.purpose || 'General') + '</small></td>';
        html += '<td><small>' + escapeHtml(donation.email || '') + '</small></td>';
        html += '<td>' + escapeHtml(donation.phone || '') + '</td>';
        html += '<td>' + (donation.proof_file_url ? '<button class="btn-sm btn-view" onclick="viewProofOfPayment(' + realIndex + ')" title="View POP" style="background:#1B7A3D;color:#fff;"><i class="fas fa-file-image"></i> View</button>' : (donation.has_proof_of_payment ? '<span style="color:#f47920;"><i class="fas fa-check"></i> Uploaded</span>' : '<span style="color:#9ca3af;">None</span>')) + '</td>';
        html += '<td><small>' + escapeHtml(donation.submitted_at ? new Date(donation.submitted_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : '') + '</small></td>';
        html += '<td><span class="status-badge status-' + status + '">' + status + '</span></td>';
        html += '<td class="action-btns">';
        html += '<button class="btn-sm btn-view" onclick="viewDonation(' + realIndex + ')" title="View Details"><i class="fas fa-eye"></i></button>';
        if (status === 'pending') {
            html += '<button class="btn-sm btn-approve" onclick="verifyDonation(' + realIndex + ')" title="Verify"><i class="fas fa-check"></i></button>';
        }
        var phone = formatPhone(donation.phone || '');
        html += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========================================
// 17. VIEW DONATION DETAIL (Modal)
// ========================================
function viewDonation(index) {
    var donations = getDonations();
    var d = donations[index];
    if (!d) return;

    var body = document.getElementById('modal-body');
    var footer = document.getElementById('modal-footer');

    var fields = [
        { label: 'Donor Name', value: d.donor_name || ((d.first_name || '') + ' ' + (d.last_name || '')) },
        { label: 'Donor Type', value: d.donor_type || 'individual' },
        { label: 'Organisation', value: d.org_name || 'N/A' },
        { label: 'Contact Person', value: d.contact_person || 'N/A' },
        { label: 'Email', value: d.email },
        { label: 'Phone', value: d.phone },
        { label: 'Amount', value: d.amount ? 'R' + parseFloat(d.amount).toLocaleString('en-ZA') : 'N/A' },
        { label: 'Purpose', value: d.purpose || 'General' },
        { label: 'Message', value: d.message || 'None' },
        { label: 'Proof of Payment', value: d.has_proof_of_payment ? (d.proof_file_name || 'Uploaded') : 'Not uploaded' },
        { label: 'Status', value: d.status || 'pending' },
        { label: 'Submitted', value: d.submitted_at ? new Date(d.submitted_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'N/A' },
        { label: 'Verified At', value: d.verified_at ? new Date(d.verified_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'Not yet verified' }
    ];

    var html = '';
    fields.forEach(function (f) {
        html += '<div class="detail-row"><span class="detail-label">' + f.label + '</span><span class="detail-value">' + escapeHtml(String(f.value || '')) + '</span></div>';
    });

    // Add POP preview if available
    if (d.proof_file_url) {
        var isImage = d.proof_file_type && d.proof_file_type.indexOf('image') !== -1;
        if (isImage) {
            html += '<div class="detail-row" style="flex-direction:column;align-items:flex-start;"><span class="detail-label">Proof of Payment Preview</span><img src="' + escapeHtml(d.proof_file_url) + '" style="max-width:100%;max-height:400px;border-radius:8px;margin-top:10px;border:1px solid #e5e7eb;" alt="Proof of Payment"></div>';
        } else {
            html += '<div class="detail-row" style="flex-direction:column;align-items:flex-start;"><span class="detail-label">Proof of Payment Preview</span><iframe src="' + escapeHtml(d.proof_file_url) + '" style="width:100%;height:400px;border-radius:8px;margin-top:10px;border:1px solid #e5e7eb;" allowfullscreen></iframe></div>';
        }
    }

    body.innerHTML = html;

    var status = d.status || 'pending';
    var phone = formatPhone(d.phone || '');
    var footerHtml = '';

    if (status === 'pending') {
        footerHtml += '<button class="btn-sm btn-approve" onclick="verifyDonation(' + index + '); closeModal();"><i class="fas fa-check"></i> Verify</button>';
    }
    if (d.proof_file_url) {
        footerHtml += '<button class="btn-sm btn-view" onclick="viewProofOfPayment(' + index + ')" style="background:#1B7A3D;color:#fff;"><i class="fas fa-eye"></i> View POP</button>';
    }
    footerHtml += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>';
    footerHtml += '<button class="btn-sm btn-danger" onclick="removeDonation(' + index + '); closeModal();"><i class="fas fa-trash"></i> Remove</button>';

    footer.innerHTML = footerHtml;
    document.getElementById('modal-overlay').classList.add('active');
}

// ========================================
// 17b. VIEW PROOF OF PAYMENT (iframe modal)
// ========================================
function viewProofOfPayment(index) {
    var donations = getDonations();
    var d = donations[index];
    if (!d || !d.proof_file_url) {
        return;
    }

    // Create fullscreen iframe modal overlay
    var overlay = document.createElement('div');
    overlay.id = 'pop-viewer-overlay';
    overlay.className = 'pop-viewer-overlay';

    var container = document.createElement('div');
    container.className = 'pop-viewer-container';

    // Header bar
    var header = document.createElement('div');
    header.className = 'pop-viewer-header';
    header.innerHTML = '<span><i class="fas fa-file-image"></i> POP - ' + escapeHtml(d.donor_name || 'Donor') + '</span><button class="pop-viewer-close" onclick="closePOPViewer()"><i class="fas fa-times"></i></button>';
    container.appendChild(header);

    // Content area
    var content = document.createElement('div');
    content.className = 'pop-viewer-content';

    var isImage = d.proof_file_type && d.proof_file_type.indexOf('image') !== -1;
    if (isImage) {
        var img = document.createElement('img');
        img.src = d.proof_file_url;
        img.alt = 'Proof of Payment';
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
        content.appendChild(img);
    } else {
        var iframe = document.createElement('iframe');
        iframe.src = d.proof_file_url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        iframe.setAttribute('allowfullscreen', 'true');
        content.appendChild(iframe);
    }

    container.appendChild(content);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Close on overlay click (outside content)
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePOPViewer();
    });

    // Close on Escape key
    document.addEventListener('keydown', popViewerEscHandler);
}

function popViewerEscHandler(e) {
    if (e.key === 'Escape') closePOPViewer();
}

function closePOPViewer() {
    var overlay = document.getElementById('pop-viewer-overlay');
    if (overlay) {
        overlay.remove();
    }
    document.removeEventListener('keydown', popViewerEscHandler);
}
function verifyDonation(index) {
    var donations = getDonations();
    var d = donations[index];
    if (!d) return;

    var verifiedAt = new Date().toISOString();

    gsawDB.updateDonation(d.id, {
        status: 'verified',
        verified_at: verifiedAt
    }).then(function () {
        donations[index].status = 'verified';
        donations[index].verified_at = verifiedAt;
        cachedDonations = donations;
        refreshDonationStats();
        renderDonations();
    });
}

// ========================================
// 19. REMOVE DONATION
// ========================================
function removeDonation(index) {
    if (!confirm('Are you sure you want to remove this donation record?')) return;
    var donations = getDonations();
    var removed = donations[index];
    if (!removed) return;

    gsawDB.deleteDonation(removed.id).then(function () {
        cachedDonations.splice(index, 1);
        refreshDonationStats();
        renderDonations();
    });
}

// ========================================
// 20. EXPORT DONATIONS CSV
// ========================================
function exportDonationsCSV() {
    var donations = getDonations();
    if (donations.length === 0) {
        alert('No donations to export.');
        return;
    }

    var headers = ['Donor Name', 'Donor Type', 'Organisation', 'Contact Person', 'Email', 'Phone', 'Amount (ZAR)', 'Purpose', 'Message', 'Proof of Payment', 'Status', 'Submitted At', 'Verified At'];
    var csv = headers.join(',') + '\n';

    donations.forEach(function (d) {
        var row = [
            d.donor_name || ((d.first_name || '') + ' ' + (d.last_name || '')),
            d.donor_type || 'individual',
            d.org_name || '',
            d.contact_person || '',
            d.email || '',
            d.phone || '',
            d.amount || '',
            d.purpose || 'General',
            (d.message || '').replace(/"/g, '""'),
            d.proof_file_name || '',
            d.status || 'pending',
            d.submitted_at || '',
            d.verified_at || ''
        ];
        csv += row.map(function (val) { return '"' + String(val) + '"'; }).join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'gsaw_donations_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
}
