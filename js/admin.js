/* ========================================
   GSAW Admin Panel - JavaScript
   Handles: Navigation, Data Display, Approval, Export, Charts
======================================== */

// ========================================
// BULK ACTIONS TOGGLE
// ========================================
var bulkActionsVisible = false;
function toggleBulkActions() {
    bulkActionsVisible = !bulkActionsVisible;
    var bar = document.getElementById('bulk-actions');
    if (bar) bar.style.display = bulkActionsVisible ? 'flex' : 'none';
    // Show/hide checkbox column in table
    var checkboxCells = document.querySelectorAll('.app-checkbox-cell');
    checkboxCells.forEach(function(c) { c.style.display = bulkActionsVisible ? '' : 'none'; });
    // Uncheck all when hiding
    if (!bulkActionsVisible) {
        var allCbs = document.querySelectorAll('.app-select-checkbox');
        allCbs.forEach(function(cb) { cb.checked = false; });
        var selectAll = document.getElementById('select-all-apps');
        if (selectAll) selectAll.checked = false;
        updateSelectedCount();
    }
}

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
        donations: 'Donations (Treasurer)',
        volunteers: 'Volunteers',
        messages: 'Contact Messages',
        announcements: 'Announcements & Banners',
        'cms-events': 'Events Management',
        'cms-news': 'News Management',
        'cms-gallery': 'Gallery Management',
        'cms-leaders': 'Leadership Management'
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
    if (viewId === 'volunteers') loadVolunteers();
    if (viewId === 'messages') loadMessages();
    if (viewId === 'announcements') renderAnnouncements();
    if (viewId === 'cms-events') renderCmsEvents();
    if (viewId === 'cms-news') renderCmsNews();
    if (viewId === 'cms-gallery') renderCmsGallery();
    if (viewId === 'cms-leaders') renderCmsLeaders();
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

function getVolunteers() {
    return cachedVolunteers;
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

    // Also prefetch volunteers for dashboard chart
    var p4 = gsawDB.getVolunteers().then(function (data) {
        if (Array.isArray(data)) { cachedVolunteers = data; }
        renderVolunteerTrendsChart();
    }).catch(function () { renderVolunteerTrendsChart(); });

    var p3 = loadMessages();

    Promise.all([p1, p2, p3, p4]).then(function () {
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

    // Growth chart
    renderGrowthChart(apps);

    // Volunteer trends
    renderVolunteerTrendsChart();

    // Province heatmap
    renderProvinceHeatmap(apps);
}

// ========================================
// GROWTH CHART (Chart.js)
// ========================================
var growthChartInstance = null;
function renderGrowthChart(apps) {
    var canvas = document.getElementById('growth-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Group by week
    var weekData = {};
    apps.forEach(function (app) {
        if (!app.submitted_at) return;
        var d = new Date(app.submitted_at);
        var weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        var key = weekStart.toISOString().slice(0, 10);
        weekData[key] = (weekData[key] || 0) + 1;
    });

    var labels = Object.keys(weekData).sort().slice(-12);
    var data = labels.map(function (k) { return weekData[k]; });
    var cumulative = [];
    var sum = 0;
    data.forEach(function (v) { sum += v; cumulative.push(sum); });

    if (growthChartInstance) growthChartInstance.destroy();
    growthChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels.map(function (l) { return new Date(l).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }); }),
            datasets: [{
                label: 'New Members',
                data: data,
                borderColor: '#1B7A3D',
                backgroundColor: 'rgba(27,122,61,0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Cumulative',
                data: cumulative,
                borderColor: '#F47920',
                borderDash: [5, 5],
                fill: false,
                tension: 0.4
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

// ========================================
// VOLUNTEER GROWTH CHART
// ========================================
var volunteerChartInstance = null;
function renderVolunteerTrendsChart() {
    var canvas = document.getElementById('volunteer-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    var volunteers = getVolunteers();
    var weekData = {};
    volunteers.forEach(function (v) {
        if (!v.submitted_at) return;
        var d = new Date(v.submitted_at);
        var weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        var key = weekStart.toISOString().slice(0, 10);
        weekData[key] = (weekData[key] || 0) + 1;
    });

    var labels = Object.keys(weekData).sort().slice(-12);
    var data = labels.map(function (k) { return weekData[k]; });

    if (volunteerChartInstance) volunteerChartInstance.destroy();
    volunteerChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels.map(function (l) { return new Date(l).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }); }),
            datasets: [{
                label: 'New Volunteers',
                data: data,
                backgroundColor: 'rgba(244,121,32,0.7)',
                borderColor: '#F47920',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// ========================================
// PROVINCE HEATMAP
// ========================================
function renderProvinceHeatmap(apps) {
    var svg = document.getElementById('sa-province-map');
    if (!svg) return;

    // Count members per province
    var provinceCounts = {};
    var allProvinces = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];
    allProvinces.forEach(function (p) { provinceCounts[p] = 0; });
    apps.forEach(function (a) {
        if (a.province && provinceCounts.hasOwnProperty(a.province)) {
            provinceCounts[a.province]++;
        }
    });

    var maxCount = Math.max.apply(null, Object.values(provinceCounts)) || 1;

    // Color scale from light gray to dark green
    function getColor(count) {
        if (count === 0) return '#e5e7eb';
        var intensity = Math.min(count / maxCount, 1);
        var r = Math.round(229 - intensity * 202); // 229 → 27
        var g = Math.round(231 - intensity * 109); // 231 → 122
        var b = Math.round(235 - intensity * 174); // 235 → 61
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // Apply colors and tooltips
    var paths = svg.querySelectorAll('path[data-province]');
    paths.forEach(function (path) {
        var prov = path.getAttribute('data-province');
        var count = provinceCounts[prov] || 0;
        path.setAttribute('fill', getColor(count));
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '2');
        path.style.cursor = 'pointer';
        path.setAttribute('title', prov + ': ' + count + ' member' + (count !== 1 ? 's' : ''));

        // Add hover effect
        path.addEventListener('mouseenter', function () {
            this.setAttribute('stroke', '#1B7A3D');
            this.setAttribute('stroke-width', '3');
        });
        path.addEventListener('mouseleave', function () {
            this.setAttribute('stroke', '#fff');
            this.setAttribute('stroke-width', '2');
        });
    });

    // Add province labels
    var existingLabels = svg.querySelectorAll('text');
    existingLabels.forEach(function (t) { t.remove(); });

    var labelPositions = {
        'Limpopo': [380, 100], 'Mpumalanga': [410, 190], 'Gauteng': [335, 170],
        'North West': [240, 175], 'Free State': [270, 270], 'KwaZulu-Natal': [430, 270],
        'Eastern Cape': [300, 370], 'Western Cape': [120, 390], 'Northern Cape': [110, 230]
    };

    Object.keys(labelPositions).forEach(function (prov) {
        var pos = labelPositions[prov];
        var count = provinceCounts[prov] || 0;
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pos[0]);
        text.setAttribute('y', pos[1]);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', count > maxCount * 0.5 ? '#fff' : '#333');
        text.textContent = count;
        svg.appendChild(text);
    });

    // Legend
    var legend = document.getElementById('heatmap-legend');
    if (legend) {
        legend.innerHTML = '';
        var sortedProvinces = allProvinces.slice().sort(function (a, b) { return provinceCounts[b] - provinceCounts[a]; });
        sortedProvinces.forEach(function (p) {
            var span = document.createElement('span');
            span.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + getColor(provinceCounts[p]) + ';margin-right:4px;vertical-align:middle;"></span>' + p + ' (' + provinceCounts[p] + ')';
            legend.appendChild(span);
        });
    }
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
// 7. ALL APPLICATIONS VIEW (with search + pagination)
// ========================================
var APP_PAGE_SIZE = 20;
var appCurrentPage = 1;

function renderApplications() {
    var container = document.getElementById('applications-table');
    var apps = getApplications();
    var statusFilter = document.getElementById('filter-status').value;
    var provinceFilter = document.getElementById('filter-province').value;
    var searchInput = document.getElementById('search-applications');
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter
    var filtered = apps.filter(function (app) {
        if (statusFilter !== 'all' && (app.status || 'pending') !== statusFilter) return false;
        if (provinceFilter !== 'all' && app.province !== provinceFilter) return false;
        if (searchTerm) {
            var searchable = ((app.first_name || '') + ' ' + (app.last_name || '') + ' ' + (app.email || '') + ' ' + (app.phone || '') + ' ' + (app.id_number || '') + ' ' + (app.membership_number || '')).toLowerCase();
            if (searchable.indexOf(searchTerm) === -1) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No applications match your filters</p></div>';
        return;
    }

    // Pagination
    var totalPages = Math.ceil(filtered.length / APP_PAGE_SIZE);
    if (appCurrentPage > totalPages) appCurrentPage = 1;
    var start = (appCurrentPage - 1) * APP_PAGE_SIZE;
    var paged = filtered.slice(start, start + APP_PAGE_SIZE);

    var cbDisplay = bulkActionsVisible ? '' : 'display:none;';
    var html = '<table><thead><tr><th class="app-checkbox-cell" style="width:30px;' + cbDisplay + '"><input type="checkbox" id="select-all-header" onchange="toggleSelectAll(this)"></th><th>Membership #</th><th>Name</th><th>Email</th><th>Phone</th><th>Province</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    paged.forEach(function (app) {
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
        html += '<td class="app-checkbox-cell" style="' + cbDisplay + '"><input type="checkbox" class="app-select-checkbox" data-id="' + app.id + '" onchange="updateSelectedCount()"></td>';
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
        html += '<button class="btn-sm btn-danger" onclick="removeApplication(' + realIndex + ')" title="Delete"><i class="fas fa-trash"></i></button>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';

    // Pagination controls
    if (totalPages > 1) {
        html += '<div class="pagination-controls">';
        html += '<button class="btn-sm" onclick="appCurrentPage=1;renderApplications();" ' + (appCurrentPage === 1 ? 'disabled' : '') + '><i class="fas fa-angle-double-left"></i></button>';
        html += '<button class="btn-sm" onclick="appCurrentPage--;renderApplications();" ' + (appCurrentPage === 1 ? 'disabled' : '') + '><i class="fas fa-angle-left"></i></button>';
        html += '<span class="page-info">Page ' + appCurrentPage + ' of ' + totalPages + ' (' + filtered.length + ' total)</span>';
        html += '<button class="btn-sm" onclick="appCurrentPage++;renderApplications();" ' + (appCurrentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-angle-right"></i></button>';
        html += '<button class="btn-sm" onclick="appCurrentPage=' + totalPages + ';renderApplications();" ' + (appCurrentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-angle-double-right"></i></button>';
        html += '</div>';
    }

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
        // Find real index
        var realIndex = 0;
        var allApps = getApplications();
        for (var j = 0; j < allApps.length; j++) {
            if (allApps[j].id === app.id) { realIndex = j; break; }
        }

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
        html += '<button class="btn-sm btn-view" onclick="downloadMembershipCard(' + realIndex + ')" title="Download Card" style="background:#F47920;color:#fff;"><i class="fas fa-id-card"></i> Card</button>';
        html += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '?text=' + whatsappMsg + '" target="_blank"><i class="fab fa-whatsapp"></i> Message</a>';
        html += '<button class="btn-sm btn-danger" onclick="removeApplication(' + realIndex + ')" title="Delete"><i class="fas fa-trash"></i></button>';
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
    var canvas = document.getElementById('province-bar-chart');
    var apps = getApplications();
    var allProvinces = ['Gauteng', 'KwaZulu-Natal', 'Eastern Cape', 'Western Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'];

    var counts = {};
    var approvedCounts = {};
    allProvinces.forEach(function (p) { counts[p] = 0; approvedCounts[p] = 0; });
    apps.forEach(function (a) {
        if (a.province && counts.hasOwnProperty(a.province)) {
            counts[a.province]++;
            if (a.status === 'approved') approvedCounts[a.province]++;
        }
    });

    // Chart.js horizontal bar chart
    if (canvas && typeof Chart !== 'undefined') {
        if (window.provinceChartInstance) window.provinceChartInstance.destroy();
        window.provinceChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: allProvinces,
                datasets: [{
                    label: 'Total',
                    data: allProvinces.map(function (p) { return counts[p]; }),
                    backgroundColor: 'rgba(27,122,61,0.65)',
                    borderColor: '#1B7A3D',
                    borderWidth: 1,
                    borderRadius: 5
                }, {
                    label: 'Approved',
                    data: allProvinces.map(function (p) { return approvedCounts[p]; }),
                    backgroundColor: 'rgba(244,121,32,0.7)',
                    borderColor: '#F47920',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // Province detail rows sorted by count
    var sorted = allProvinces.slice().sort(function (a, b) { return counts[b] - counts[a]; });
    var total = apps.length || 1;
    var html = '';
    sorted.forEach(function (province) {
        var cnt = counts[province];
        var appr = approvedCounts[province];
        var pct = Math.round((cnt / total) * 100);
        html += '<div style="padding:12px 20px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--gray-200);">';
        html += '<span style="width:160px;font-weight:600;font-size:0.85rem;color:var(--dark);">' + province + '</span>';
        html += '<div style="flex:1;background:var(--gray-200);border-radius:4px;height:8px;overflow:hidden;">';
        html += '<div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#1B7A3D,#24a352);width:' + pct + '%;transition:width 0.8s ease;"></div>';
        html += '</div>';
        html += '<span style="width:60px;text-align:right;font-size:0.82rem;"><strong>' + cnt + '</strong> total</span>';
        html += '<span style="width:80px;text-align:right;font-size:0.82rem;color:var(--green);"><strong>' + appr + '</strong> approved</span>';
        html += '</div>';
    });

    container.innerHTML = html || '<div class="empty-state"><i class="fas fa-map"></i><p>No member data yet</p></div>';
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
    if (status === 'approved') {
        footerHtml += '<button class="btn-sm" onclick="downloadMembershipCard(' + index + ')" style="background:#F47920;color:#fff;"><i class="fas fa-id-card"></i> Download Card</button>';
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
// 13. EXPORT TO CSV (Excel-friendly with BOM)
// ========================================
function exportCSV() {
    var apps = getApplications();
    if (apps.length === 0) {
        alert('No applications to export.');
        return;
    }

    var headers = ['Membership #', 'First Name', 'Last Name', 'Email', 'Phone', 'ID Number', 'Gender', 'DOB', 'Address', 'Province', 'Municipality', 'Ward', 'Voting Station', 'Occupation', 'Qualification', 'Skills', 'Reason', 'Status', 'Submitted At', 'Approved At'];

    // Use SheetJS if available for proper .xlsx export
    if (typeof XLSX !== 'undefined') {
        var data = apps.map(function (app) {
            return {
                'Membership #': app.membership_number || '',
                'First Name': app.first_name || '',
                'Last Name': app.last_name || '',
                'Email': app.email || '',
                'Phone': app.phone || '',
                'ID Number': app.id_number || '',
                'Gender': app.gender || '',
                'DOB': app.date_of_birth || '',
                'Address': app.address || '',
                'Province': app.province || '',
                'Municipality': app.municipality || '',
                'Ward': app.ward || '',
                'Voting Station': app.voting_station || '',
                'Occupation': app.occupation || '',
                'Qualification': app.qualification || '',
                'Skills': app.skills || '',
                'Reason': app.reason || '',
                'Status': app.status || 'pending',
                'Submitted At': app.submitted_at || '',
                'Approved At': app.approved_at || ''
            };
        });

        var ws = XLSX.utils.json_to_sheet(data);
        // Auto-width columns
        var colWidths = headers.map(function (h) { return { wch: Math.max(h.length, 12) }; });
        ws['!cols'] = colWidths;

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Members');

        // Add summary sheet
        var statusCounts = { pending: 0, approved: 0, rejected: 0 };
        apps.forEach(function (a) { statusCounts[a.status || 'pending']++; });
        var provinceCounts = {};
        apps.forEach(function (a) { if (a.province) provinceCounts[a.province] = (provinceCounts[a.province] || 0) + 1; });
        var summaryData = [
            { Metric: 'Total Applications', Value: apps.length },
            { Metric: 'Approved', Value: statusCounts.approved },
            { Metric: 'Pending', Value: statusCounts.pending },
            { Metric: 'Rejected', Value: statusCounts.rejected },
            { Metric: '---', Value: '---' },
            { Metric: 'Export Date', Value: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) }
        ];
        Object.keys(provinceCounts).sort().forEach(function (p) {
            summaryData.push({ Metric: p, Value: provinceCounts[p] });
        });
        var ws2 = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

        XLSX.writeFile(wb, 'gsaw_members_' + new Date().toISOString().slice(0, 10) + '.xlsx');
        return;
    }

    // Fallback to CSV if SheetJS not loaded
    var csv = '\uFEFF' + headers.join(',') + '\n';

    apps.forEach(function (app) {
        var row = [
            app.membership_number || '', app.first_name || '', app.last_name || '', app.email || '', app.phone || '',
            app.id_number || '', app.gender || '', app.date_of_birth || '', (app.address || '').replace(/"/g, '""'),
            app.province || '', app.municipality || '', app.ward || '', app.voting_station || '',
            app.occupation || '', app.qualification || '', (app.skills || '').replace(/"/g, '""'), (app.reason || '').replace(/"/g, '""').replace(/\n/g, ' '),
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
// 16. RENDER DONATIONS TABLE (with search + pagination)
// ========================================
var DON_PAGE_SIZE = 20;
var donCurrentPage = 1;

function renderDonations() {
    var container = document.getElementById('donations-table');
    if (!container) return;

    var donations = getDonations();
    var statusFilter = document.getElementById('filter-donation-status').value;
    var searchInput = document.getElementById('search-donations');
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    var filtered = donations.filter(function (d) {
        if (statusFilter !== 'all' && (d.status || 'pending') !== statusFilter) return false;
        if (searchTerm) {
            var searchable = ((d.donor_name || '') + ' ' + (d.first_name || '') + ' ' + (d.last_name || '') + ' ' + (d.email || '') + ' ' + (d.phone || '')).toLowerCase();
            if (searchable.indexOf(searchTerm) === -1) return false;
        }
        return true;
    });

    refreshDonationStats();

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>No donations match your filters</p><small>Donations submitted on the website will appear here</small></div>';
        return;
    }

    // Pagination
    var totalPages = Math.ceil(filtered.length / DON_PAGE_SIZE);
    if (donCurrentPage > totalPages) donCurrentPage = 1;
    var start = (donCurrentPage - 1) * DON_PAGE_SIZE;
    var paged = filtered.slice(start, start + DON_PAGE_SIZE);

    var html = '<table><thead><tr><th>Donor</th><th>Type</th><th>Amount</th><th>Purpose</th><th>Email</th><th>Phone</th><th>POP</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    paged.forEach(function (donation) {
        // Find real index
        var realIndex = 0;
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
        html += '<button class="btn-sm btn-danger" onclick="removeDonation(' + realIndex + ')" title="Delete"><i class="fas fa-trash"></i></button>';
        var phone = formatPhone(donation.phone || '');
        html += '<a class="btn-sm btn-whatsapp" href="https://wa.me/' + encodeURIComponent(phone) + '" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';

    // Pagination controls
    if (totalPages > 1) {
        html += '<div class="pagination-controls">';
        html += '<button class="btn-sm" onclick="donCurrentPage=1;renderDonations();" ' + (donCurrentPage === 1 ? 'disabled' : '') + '><i class="fas fa-angle-double-left"></i></button>';
        html += '<button class="btn-sm" onclick="donCurrentPage--;renderDonations();" ' + (donCurrentPage === 1 ? 'disabled' : '') + '><i class="fas fa-angle-left"></i></button>';
        html += '<span class="page-info">Page ' + donCurrentPage + ' of ' + totalPages + ' (' + filtered.length + ' total)</span>';
        html += '<button class="btn-sm" onclick="donCurrentPage++;renderDonations();" ' + (donCurrentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-angle-right"></i></button>';
        html += '<button class="btn-sm" onclick="donCurrentPage=' + totalPages + ';renderDonations();" ' + (donCurrentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-angle-double-right"></i></button>';
        html += '</div>';
    }

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
    var csv = '\uFEFF' + headers.join(',') + '\n';

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
            (d.message || '').replace(/"/g, '""').replace(/\n/g, ' '),
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

// ========================================
// 21. MEMBERSHIP CARD PDF DOWNLOAD
// ========================================
function downloadMembershipCard(index) {
    var apps = getApplications();
    var app = apps[index];
    if (!app || app.status !== 'approved') {
        alert('Only approved members can get a membership card.');
        return;
    }

    var firstName = app.first_name || '';
    var lastName = app.last_name || '';
    var membershipNum = app.membership_number || '';
    var province = app.province || '';
    var approvedDate = app.approved_at ? new Date(app.approved_at).toLocaleDateString('en-ZA') : new Date().toLocaleDateString('en-ZA');

    // Create card using canvas and download as image
    var canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 550;
    var ctx = canvas.getContext('2d');

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, 900, 550);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 550);

    // Green accent bar
    ctx.fillStyle = '#1B7A3D';
    ctx.fillRect(0, 0, 900, 8);
    ctx.fillRect(0, 542, 900, 8);

    // Red accent line
    ctx.fillStyle = '#E31E24';
    ctx.fillRect(0, 8, 900, 3);

    // Party name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOD SAVE AFRICA & THE WORLD', 450, 60);

    // Subtitle
    ctx.fillStyle = '#F47920';
    ctx.font = '16px Montserrat, Arial, sans-serif';
    ctx.fillText('OFFICIAL MEMBERSHIP CARD', 450, 90);

    // Divider
    ctx.strokeStyle = '#1B7A3D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 110);
    ctx.lineTo(750, 110);
    ctx.stroke();

    // Member details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('MEMBER NAME', 80, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Montserrat, Arial, sans-serif';
    ctx.fillText(firstName + ' ' + lastName, 80, 195);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('MEMBERSHIP NUMBER', 80, 250);
    ctx.fillStyle = '#1B7A3D';
    ctx.font = 'bold 24px Montserrat, Arial, sans-serif';
    ctx.fillText(membershipNum, 80, 285);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('PROVINCE', 80, 340);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Montserrat, Arial, sans-serif';
    ctx.fillText(province, 80, 370);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('DATE APPROVED', 80, 420);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Montserrat, Arial, sans-serif';
    ctx.fillText(approvedDate, 80, 450);

    // Right side - ID Number
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('ID NUMBER', 500, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Montserrat, Arial, sans-serif';
    var idDisplay = (app.id_number || '').substring(0, 6) + '*******';
    ctx.fillText(idDisplay, 500, 190);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Montserrat, Arial, sans-serif';
    ctx.fillText('STATUS', 500, 250);
    ctx.fillStyle = '#1B7A3D';
    ctx.font = 'bold 20px Montserrat, Arial, sans-serif';
    ctx.fillText('✓ ACTIVE MEMBER', 500, 280);

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F47920';
    ctx.font = 'bold 14px Montserrat, Arial, sans-serif';
    ctx.fillText('#AllPowerBelongsToJesus', 450, 510);

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Montserrat, Arial, sans-serif';
    ctx.fillText('This card is the property of GSAW. Report loss to your branch leader.', 450, 530);

    // Download
    var dataUrl = canvas.toDataURL('image/png');
    var link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'GSAW_Card_' + membershipNum + '.png';
    link.click();
}

// ========================================
// 22. BULK ACTIONS
// ========================================
function toggleSelectAll(checkbox) {
    var checkboxes = document.querySelectorAll('.app-select-checkbox');
    checkboxes.forEach(function (cb) { cb.checked = checkbox.checked; });
    updateSelectedCount();
}

function updateSelectedCount() {
    var checked = document.querySelectorAll('.app-select-checkbox:checked');
    var countEl = document.getElementById('selected-count');
    if (countEl) countEl.textContent = checked.length + ' selected';
}

function getSelectedIds() {
    var checked = document.querySelectorAll('.app-select-checkbox:checked');
    var ids = [];
    checked.forEach(function (cb) { ids.push(cb.getAttribute('data-id')); });
    return ids;
}

function bulkApprove() {
    var ids = getSelectedIds();
    if (ids.length === 0) { alert('No applications selected.'); return; }
    if (!confirm('Approve ' + ids.length + ' application(s)?')) return;

    var apps = getApplications();
    var approvedAt = new Date().toISOString();
    var promises = ids.map(function (id) {
        return gsawDB.updateMembership(id, { status: 'approved', approved_at: approvedAt });
    });

    Promise.all(promises).then(function () {
        // Update local cache
        ids.forEach(function (id) {
            var app = apps.find(function (a) { return a.id === id; });
            if (app) { app.status = 'approved'; app.approved_at = approvedAt; }
        });
        refreshData();
    });
}

function bulkDelete() {
    var ids = getSelectedIds();
    if (ids.length === 0) { alert('No applications selected.'); return; }
    if (!confirm('DELETE ' + ids.length + ' application(s)? This cannot be undone!')) return;

    var promises = ids.map(function (id) {
        return gsawDB.deleteMembership(id);
    });

    Promise.all(promises).then(function () {
        cachedApplications = cachedApplications.filter(function (a) {
            return ids.indexOf(a.id) === -1;
        });
        refreshData();
    });
}

// ========================================
// VOLUNTEERS MANAGEMENT
// ========================================
var cachedVolunteers = [];

function loadVolunteers() {
    gsawDB.getVolunteers().then(function (data) {
        if (Array.isArray(data)) {
            cachedVolunteers = data;
            renderVolunteers();
        }
    });
}

function renderVolunteers() {
    var container = document.getElementById('volunteers-table');
    if (!container) return;

    var search = (document.getElementById('search-volunteers') || {}).value || '';
    search = search.toLowerCase();

    var filtered = cachedVolunteers.filter(function (v) {
        if (!search) return true;
        var text = (v.first_name + ' ' + v.last_name + ' ' + v.email + ' ' + v.province + ' ' + v.areas).toLowerCase();
        return text.indexOf(search) !== -1;
    });

    // Update stats
    var countEl = document.getElementById('stat-vol-count');
    var provEl = document.getElementById('stat-vol-provinces');
    if (countEl) countEl.textContent = cachedVolunteers.length;
    if (provEl) {
        var provinces = {};
        cachedVolunteers.forEach(function (v) { if (v.province) provinces[v.province] = true; });
        provEl.textContent = Object.keys(provinces).length;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-hands-helping"></i><p>No volunteers yet</p><small>Share the volunteer page to start receiving signups</small></div>';
        return;
    }

    var html = '<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Province</th><th>Areas</th><th>Availability</th><th>Date</th></tr></thead><tbody>';
    filtered.forEach(function (v) {
        html += '<tr>';
        html += '<td><strong>' + (v.first_name || '') + ' ' + (v.last_name || '') + '</strong></td>';
        html += '<td><a href="mailto:' + (v.email || '') + '">' + (v.email || '') + '</a></td>';
        html += '<td>' + (v.phone || '') + '</td>';
        html += '<td>' + (v.province || '') + '</td>';
        html += '<td><span style="font-size:0.8rem;">' + (v.areas || '') + '</span></td>';
        html += '<td>' + (v.availability || '-') + '</td>';
        html += '<td style="font-size:0.8rem;">' + (v.submitted_at || v.created_at || '') + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function exportVolunteersCSV() {
    if (cachedVolunteers.length === 0) {
        alert('No volunteers to export.');
        return;
    }

    var headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Province', 'Areas', 'Availability', 'Message', 'Submitted At'];

    if (typeof XLSX !== 'undefined') {
        var data = cachedVolunteers.map(function (v) {
            return {
                'First Name': v.first_name || '',
                'Last Name': v.last_name || '',
                'Email': v.email || '',
                'Phone': v.phone || '',
                'Province': v.province || '',
                'Areas': v.areas || '',
                'Availability': v.availability || '',
                'Message': v.message || '',
                'Submitted At': v.submitted_at || ''
            };
        });
        var ws = XLSX.utils.json_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Volunteers');
        XLSX.writeFile(wb, 'gsaw_volunteers_' + new Date().toISOString().slice(0, 10) + '.xlsx');
        return;
    }

    var csv = '\uFEFF' + headers.join(',') + '\n';
    cachedVolunteers.forEach(function (v) {
        var row = [v.first_name || '', v.last_name || '', v.email || '', v.phone || '', v.province || '', (v.areas || '').replace(/"/g, '""'), v.availability || '', (v.message || '').replace(/"/g, '""').replace(/\n/g, ' '), v.submitted_at || ''];
        csv += row.map(function (val) { return '"' + String(val) + '"'; }).join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'gsaw_volunteers_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
}

// ========================================
// CONTACT MESSAGES
// ========================================
var cachedMessages = [];

function loadMessages() {
    return gsawDB.getContactMessages().then(function (data) {
        if (Array.isArray(data)) {
            cachedMessages = data;
            renderMessages();
            updateUnreadBadge();
        }
    }).catch(function () {});
}

function updateUnreadBadge() {
    var unread = cachedMessages.filter(function (m) { return !m.is_read; }).length;
    var badge = document.getElementById('unread-badge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'inline' : 'none';
    }
    var statTotal = document.getElementById('stat-msg-total');
    var statUnread = document.getElementById('stat-msg-unread');
    if (statTotal) statTotal.textContent = cachedMessages.length;
    if (statUnread) statUnread.textContent = unread;
}

function renderMessages() {
    var container = document.getElementById('messages-table');
    if (!container) return;

    var search = (document.getElementById('search-messages') || {}).value || '';
    search = search.toLowerCase();
    var filtered = cachedMessages.filter(function (m) {
        if (!search) return true;
        return (m.name || '').toLowerCase().indexOf(search) > -1 ||
               (m.email || '').toLowerCase().indexOf(search) > -1 ||
               (m.subject || '').toLowerCase().indexOf(search) > -1;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">No messages found.</div>';
        return;
    }

    var html = '<table class="data-table"><thead><tr><th>Status</th><th>Name</th><th>Email</th><th>Subject</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    filtered.forEach(function (m) {
        var isRead = m.is_read;
        var rowStyle = isRead ? '' : 'font-weight:600;background:#fef3c7;';
        html += '<tr style="' + rowStyle + '">';
        html += '<td>' + (isRead ? '<i class="fas fa-envelope-open" style="color:#9ca3af;"></i>' : '<i class="fas fa-envelope" style="color:#E31E24;"></i> New') + '</td>';
        html += '<td>' + escapeHtml(m.name) + '</td>';
        html += '<td><a href="mailto:' + escapeHtml(m.email) + '">' + escapeHtml(m.email) + '</a></td>';
        html += '<td>' + escapeHtml(m.subject) + '</td>';
        html += '<td style="white-space:nowrap;">' + escapeHtml(m.submitted_at || new Date(m.created_at).toLocaleString('en-ZA')) + '</td>';
        html += '<td><button class="btn-action btn-sm" onclick="viewMessage(\'' + m.id + '\')" title="View"><i class="fas fa-eye"></i></button>';
        if (!isRead) {
            html += ' <button class="btn-action btn-sm" onclick="markMessageRead(\'' + m.id + '\')" title="Mark as read" style="background:#1B7A3D;color:#fff;"><i class="fas fa-check"></i></button>';
        }
        html += ' <button class="btn-action btn-sm" onclick="viewMessage(\'' + m.id + '\')" title="View & Reply" style="background:#F47920;color:#fff;"><i class="fas fa-reply"></i></button>';
        html += '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function viewMessage(id) {
    var m = cachedMessages.find(function (msg) { return msg.id === id; });
    if (!m) return;

    var body = document.getElementById('modal-body');
    var footer = document.getElementById('modal-footer');
    var overlay = document.getElementById('modal-overlay');
    var title = document.querySelector('#detail-modal .modal-header h3');

    if (title) title.textContent = 'Contact Message';
    body.innerHTML =
        '<div style="margin-bottom:15px;"><strong>From:</strong> ' + escapeHtml(m.name) + ' &lt;' + escapeHtml(m.email) + '&gt;</div>' +
        '<div style="margin-bottom:15px;"><strong>Subject:</strong> ' + escapeHtml(m.subject) + '</div>' +
        '<div style="margin-bottom:15px;"><strong>Date:</strong> ' + escapeHtml(m.submitted_at || new Date(m.created_at).toLocaleString('en-ZA')) + '</div>' +
        '<div style="background:#f9fafb;padding:15px;border-radius:8px;border:1px solid #e5e7eb;white-space:pre-wrap;">' + escapeHtml(m.message) + '</div>';

    var replyTemplate = 'Dear ' + (m.name || 'Sir/Madam') + ',\n\nThank you for reaching out to God Save Africa & The World (GSAW).\n\nWe have received your message regarding "' + (m.subject || 'your enquiry') + '" and appreciate you taking the time to contact us.\n\n[Your response here]\n\nMay God bless you.\n\nKind regards,\nGSAW National Office\ninfo@gsaw.org.za | +27 73 585 0365\nwww.gsaw.org.za';
    var mailtoLink = 'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: ' + (m.subject || 'Your enquiry to GSAW')) + '&body=' + encodeURIComponent(replyTemplate);

    footer.innerHTML =
        '<a href="' + mailtoLink + '" class="btn-action" style="background:#F47920;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-reply"></i> Reply via Email</a>' +
        (!m.is_read ? ' <button class="btn-action" onclick="markMessageRead(\'' + m.id + '\');closeModal();" style="background:#1B7A3D;color:#fff;padding:10px 20px;border-radius:8px;"><i class="fas fa-check"></i> Mark as Read</button>' : '');

    overlay.classList.add('active');

    // Auto-mark as read on view
    if (!m.is_read) markMessageRead(id);
}

function markMessageRead(id) {
    fetch(SUPABASE_URL + '/rest/v1/contact_messages?id=eq.' + id, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ is_read: true })
    }).then(function () {
        var m = cachedMessages.find(function (msg) { return msg.id === id; });
        if (m) m.is_read = true;
        renderMessages();
        updateUnreadBadge();
    });
}

function exportMessagesCSV() {
    if (cachedMessages.length === 0) {
        alert('No messages to export.');
        return;
    }
    if (typeof XLSX !== 'undefined') {
        var data = cachedMessages.map(function (m) {
            return {
                'Name': m.name || '',
                'Email': m.email || '',
                'Subject': m.subject || '',
                'Message': m.message || '',
                'Date': m.submitted_at || '',
                'Read': m.is_read ? 'Yes' : 'No'
            };
        });
        var ws = XLSX.utils.json_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Messages');
        XLSX.writeFile(wb, 'gsaw_messages_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    }
}

// ========================================
// CMS MANAGEMENT — shared helpers
// ========================================

var cmsCurrentType = null;
var cmsCurrentRecord = null;
var cmsUploadedImage = null; // { path, url } after uploading

function cmsEsc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str || '')));
    return d.innerHTML;
}

function cmsLoading(containerId) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;"></i><p style="margin-top:10px;font-size:0.85rem;">Loading...</p></div>';
}

function cmsEmpty(containerId, msg) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;"><i class="fas fa-inbox" style="font-size:2rem;"></i><p style="margin-top:10px;font-size:0.85rem;">' + (msg || 'No items yet') + '</p></div>';
}

function openCmsModal(type, record) {
    cmsCurrentType = type;
    cmsCurrentRecord = record || null;
    cmsUploadedImage = null;
    var titleMap = { announcement: 'Announcement', event: 'Event', news: 'News Article', leader: 'Leader' };
    document.getElementById('cms-modal-title').textContent = (record ? 'Edit' : 'New') + ' ' + (titleMap[type] || type);
    document.getElementById('cms-modal-body').innerHTML = buildCmsForm(type, record);
    document.getElementById('cms-modal-footer').innerHTML =
        '<button style="padding:9px 20px;border-radius:8px;border:none;background:#e5e7eb;color:#374151;cursor:pointer;font-size:0.85rem;" onclick="closeCmsModal()">Cancel</button>' +
        '<button style="padding:9px 24px;border-radius:8px;border:none;background:#1B7A3D;color:#fff;cursor:pointer;font-weight:600;font-size:0.85rem;" onclick="saveCmsItem()">' +
        '<i class="fas fa-save"></i> Save</button>';
    document.getElementById('cms-modal-overlay').style.display = 'flex';
}

function closeCmsModal(e) {
    if (e && e.target !== document.getElementById('cms-modal-overlay')) return;
    document.getElementById('cms-modal-overlay').style.display = 'none';
    cmsCurrentType = null;
    cmsCurrentRecord = null;
    cmsUploadedImage = null;
}

function buildCmsForm(type, r) {
    r = r || {};
    var html = '';
    var inp = function(label, name, val, type2, req, placeholder) {
        return '<div style="margin-bottom:14px;">' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:5px;">' + label + (req ? ' <span style="color:#E31E24;">*</span>' : '') + '</label>' +
            '<input type="' + (type2 || 'text') + '" name="' + name + '" value="' + cmsEsc(val || '') + '" ' + (req ? 'required' : '') + ' placeholder="' + (placeholder || '') + '" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' +
            '</div>';
    };
    var ta = function(label, name, val, rows, req) {
        return '<div style="margin-bottom:14px;">' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:5px;">' + label + (req ? ' <span style="color:#E31E24;">*</span>' : '') + '</label>' +
            '<textarea name="' + name + '" rows="' + (rows || 3) + '" ' + (req ? 'required' : '') + ' style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:0.85rem;box-sizing:border-box;resize:vertical;">' + cmsEsc(val || '') + '</textarea>' +
            '</div>';
    };
    var sel = function(label, name, options, val) {
        var opts = options.map(function(o) {
            var v = o.value !== undefined ? o.value : o;
            var t = o.text || o;
            return '<option value="' + cmsEsc(v) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + cmsEsc(t) + '</option>';
        }).join('');
        return '<div style="margin-bottom:14px;">' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:5px;">' + label + '</label>' +
            '<select name="' + name + '" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:0.85rem;box-sizing:border-box;">' + opts + '</select></div>';
    };
    var chk = function(label, name, checked) {
        return '<div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">' +
            '<input type="checkbox" name="' + name + '" id="chk-' + name + '" ' + (checked ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;">' +
            '<label for="chk-' + name + '" style="font-size:0.85rem;color:#374151;cursor:pointer;">' + label + '</label></div>';
    };
    var imgUpload = function(currentUrl) {
        var preview = currentUrl
            ? '<div id="cms-img-preview" style="margin-bottom:8px;"><img src="' + currentUrl + '" style="max-width:100%;max-height:150px;border-radius:6px;object-fit:cover;"></div>'
            : '<div id="cms-img-preview"></div>';
        return '<div style="margin-bottom:14px;">' +
            '<label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:5px;">Image ' + (currentUrl ? '(Upload new to replace)' : '') + '</label>' +
            preview +
            '<input type="file" id="cms-img-input" accept="image/jpeg,image/png,image/webp,image/gif" onchange="cmsPreviewAndUpload(this)" style="font-size:0.82rem;width:100%;">' +
            '<div id="cms-upload-status" style="font-size:0.78rem;color:#1B7A3D;margin-top:4px;"></div>' +
            '</div>';
    };
    var row2 = function(a, b) { return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + a + b + '</div>'; };

    if (type === 'announcement') {
        html += ta('Banner Message', 'message', r.message, 3, true);
        html += row2(
            sel('Urgency Colour', 'color',
                [{value:'green',text:'Green (Info/Success)'},{value:'orange',text:'Orange (Warning)'},{value:'red',text:'Red (Urgent)'}],
                r.color || 'green'),
            inp('Link URL', 'link_url', r.link_url, 'url', false, 'https://...')
        );
        html += inp('Link Button Text', 'link_text', r.link_text, 'text', false, 'e.g. Register Now');
        html += row2(
            inp('Start Date & Time', 'start_date', r.start_date ? r.start_date.slice(0,16) : '', 'datetime-local'),
            inp('End Date & Time (auto-expire)', 'end_date', r.end_date ? r.end_date.slice(0,16) : '', 'datetime-local')
        );
        html += chk('Show countdown timer', 'show_countdown', r.show_countdown);
        html += inp('Countdown Target Date & Time', 'countdown_date', r.countdown_date ? r.countdown_date.slice(0,16) : '', 'datetime-local');
        html += chk('Active (show on website)', 'is_active', r.is_active !== false);
    } else if (type === 'event') {
        html += inp('Event Title', 'title', r.title, 'text', true);
        html += row2(
            sel('Event Type', 'event_type',
                [{value:'general',text:'General'},{value:'gospel',text:'Gospel Event'},{value:'registration',text:'Voter Registration'},{value:'rally',text:'Rally'},{value:'outreach',text:'Community Outreach'}],
                r.event_type || 'general'),
            inp('Date', 'event_date', r.event_date, 'date', true)
        );
        html += row2(
            inp('Time', 'event_time', r.event_time, 'time'),
            inp('Location', 'location', r.location, 'text', false, 'e.g. Cape Town Stadium')
        );
        html += ta('Description', 'description', r.description, 4);
        html += row2(
            inp('Link URL', 'link_url', r.link_url, 'url', false, 'https://...'),
            inp('Link Button Text', 'link_text', r.link_text, 'text', false, 'More Info')
        );
        html += imgUpload(r.image_url);
        html += chk('Archive (hide from public)', 'is_archived', r.is_archived);
    } else if (type === 'news') {
        html += inp('Article Title', 'title', r.title, 'text', true);
        html += ta('Summary (shown on news card)', 'summary', r.summary, 2);
        html += ta('Full Article Body', 'body', r.body, 7);
        html += row2(
            inp('Author', 'author', r.author || 'GSAW NEC', 'text'),
            sel('Category', 'category',
                ['General','Announcement','Press Release','Community','Policy'],
                r.category || 'General')
        );
        html += inp('Published Date', 'published_at', r.published_at ? r.published_at.slice(0,16) : new Date().toISOString().slice(0,16), 'datetime-local');
        html += imgUpload(r.cover_image_url);
        html += chk('Published (visible on website)', 'is_published', r.is_published !== false);
    } else if (type === 'leader') {
        html += row2(
            inp('Full Name', 'name', r.name, 'text', true),
            inp('Position / Title', 'title', r.title, 'text', true, 'e.g. President')
        );
        html += ta('Short Bio (optional)', 'bio', r.bio, 3);
        html += row2(
            inp('Display Order (lower = first)', 'display_order', r.display_order || 10, 'number'),
            '<div style="margin-bottom:14px;"></div>'
        );
        html += chk('Primary Leader (large hero card)', 'is_primary', r.is_primary);
        html += chk('Active (show on website)', 'is_active', r.is_active !== false);
        html += imgUpload(r.photo_url);
    }
    return html;
}

function cmsPreviewAndUpload(input) {
    var file = input.files[0];
    if (!file) return;
    var maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) { alert('File is too large. Maximum size is ' + maxMB + 'MB.'); input.value = ''; return; }
    var statusEl = document.getElementById('cms-upload-status');
    var previewEl = document.getElementById('cms-img-preview');
    statusEl.textContent = 'Uploading...';
    cmsUploadedImage = null;
    var folderMap = { announcement: 'banners', event: 'events', news: 'news', leader: 'leaders' };
    gsawDB.cmsUploadFile(file, folderMap[cmsCurrentType] || 'media')
        .then(function(result) {
            cmsUploadedImage = result;
            statusEl.style.color = '#1B7A3D';
            statusEl.textContent = 'Uploaded: ' + file.name;
            previewEl.innerHTML = '<img src="' + result.url + '" style="max-width:100%;max-height:150px;border-radius:6px;object-fit:cover;margin-bottom:4px;">';
        })
        .catch(function(err) {
            statusEl.style.color = '#E31E24';
            statusEl.textContent = 'Upload failed: ' + (err.message || 'Please try again');
        });
}

function cmsGetFormValues() {
    var body = document.getElementById('cms-modal-body');
    var inputs = body.querySelectorAll('input,textarea,select');
    var data = {};
    inputs.forEach(function(el) {
        if (!el.name) return;
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else if (el.type === 'file') return;
        else data[el.name] = el.value || null;
    });
    return data;
}

function saveCmsItem() {
    var type = cmsCurrentType;
    var r = cmsCurrentRecord;
    var d = cmsGetFormValues();
    var btn = document.querySelector('#cms-modal-footer button:last-child');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    var oldImagePath = null;
    var promise;

    if (type === 'announcement') {
        if (!d.message) { alert('Please enter a banner message.'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; return; }
        if (d.start_date) d.start_date = new Date(d.start_date).toISOString();
        else d.start_date = null;
        if (d.end_date) d.end_date = new Date(d.end_date).toISOString();
        else d.end_date = null;
        if (d.countdown_date) d.countdown_date = new Date(d.countdown_date).toISOString();
        else d.countdown_date = null;
        promise = r ? gsawDB.updateAnnouncement(r.id, d) : gsawDB.addAnnouncement(d);
        promise.then(function() { closeCmsModal(); renderAnnouncements(); }).catch(cmsHandleError(btn));

    } else if (type === 'event') {
        if (!d.title || !d.event_date) { alert('Title and Date are required.'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; return; }
        if (cmsUploadedImage) {
            oldImagePath = r && r.image_path ? r.image_path : null;
            d.image_url = cmsUploadedImage.url;
            d.image_path = cmsUploadedImage.path;
        }
        promise = r ? gsawDB.updateCmsEvent(r.id, d) : gsawDB.addCmsEvent(d);
        promise.then(function() {
            if (oldImagePath) gsawDB.deleteStorageFile(oldImagePath);
            closeCmsModal(); renderCmsEvents();
        }).catch(cmsHandleError(btn));

    } else if (type === 'news') {
        if (!d.title) { alert('Title is required.'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; return; }
        if (d.published_at) d.published_at = new Date(d.published_at).toISOString();
        if (cmsUploadedImage) {
            oldImagePath = r && r.cover_image_path ? r.cover_image_path : null;
            d.cover_image_url = cmsUploadedImage.url;
            d.cover_image_path = cmsUploadedImage.path;
        }
        promise = r ? gsawDB.updateCmsNews(r.id, d) : gsawDB.addCmsNews(d);
        promise.then(function() {
            if (oldImagePath) gsawDB.deleteStorageFile(oldImagePath);
            closeCmsModal(); renderCmsNews();
        }).catch(cmsHandleError(btn));

    } else if (type === 'leader') {
        if (!d.name || !d.title) { alert('Name and Title are required.'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save'; return; }
        if (cmsUploadedImage) {
            oldImagePath = r && r.photo_path ? r.photo_path : null;
            d.photo_url = cmsUploadedImage.url;
            d.photo_path = cmsUploadedImage.path;
        }
        d.display_order = parseInt(d.display_order) || 10;
        promise = r ? gsawDB.updateCmsLeader(r.id, d) : gsawDB.addCmsLeader(d);
        promise.then(function() {
            if (oldImagePath) gsawDB.deleteStorageFile(oldImagePath);
            closeCmsModal(); renderCmsLeaders();
        }).catch(cmsHandleError(btn));
    }
}

function cmsHandleError(btn) {
    return function(err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';
        alert('Error saving: ' + (err.message || 'Please try again'));
    };
}

// ========================================
// CMS — ANNOUNCEMENTS
// ========================================
function renderAnnouncements() {
    cmsLoading('announcements-list');
    gsawDB.getAnnouncements().then(function(items) {
        if (!items || !items.length) { cmsEmpty('announcements-list', 'No announcements yet. Click "New Banner" to create one.'); return; }
        var html = '<table style="width:100%;border-collapse:collapse;font-size:0.83rem;">';
        html += '<thead><tr style="border-bottom:2px solid #e5e7eb;">' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Message</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Colour</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Expires</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Status</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#6c757d;font-weight:600;">Actions</th></tr></thead><tbody>';
        items.forEach(function(a) {
            var colourDot = {green:'#1B7A3D',orange:'#F47920',red:'#E31E24'}[a.color] || '#1B7A3D';
            var expiry = a.end_date ? new Date(a.end_date).toLocaleDateString('en-ZA') : '—';
            var statusBadge = a.is_active
                ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Active</span>'
                : '<span style="background:#f3f4f6;color:#6b7280;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Inactive</span>';
            html += '<tr style="border-bottom:1px solid #f3f4f6;transition:background 0.15s;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'\'">' +
                '<td style="padding:10px 12px;max-width:300px;"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;" title="' + cmsEsc(a.message) + '">' + cmsEsc(a.message) + '</div></td>' +
                '<td style="padding:10px 12px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + colourDot + ';margin-right:6px;"></span>' + (a.color || 'green') + '</td>' +
                '<td style="padding:10px 12px;">' + expiry + '</td>' +
                '<td style="padding:10px 12px;">' + statusBadge + '</td>' +
                '<td style="padding:10px 12px;text-align:right;white-space:nowrap;">' +
                '<button onclick="openCmsModal(\'announcement\',' + JSON.stringify(a).replace(/"/g,'&quot;') + ')" style="padding:5px 12px;border:none;background:#e5e7eb;color:#374151;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;"><i class="fas fa-edit"></i></button>' +
                '<button onclick="toggleAnnouncement(\'' + a.id + '\',' + !a.is_active + ')" style="padding:5px 12px;border:none;background:' + (a.is_active ? '#fef3c7' : '#d1fae5') + ';color:#374151;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;" title="' + (a.is_active ? 'Deactivate' : 'Activate') + '"><i class="fas fa-' + (a.is_active ? 'eye-slash' : 'eye') + '"></i></button>' +
                '<button onclick="deleteAnnouncement(\'' + a.id + '\')" style="padding:5px 12px;border:none;background:#fee2e2;color:#E31E24;border-radius:6px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('announcements-list').innerHTML = html;
    }).catch(function() { cmsEmpty('announcements-list', 'Failed to load. Try refreshing.'); });
}

function toggleAnnouncement(id, newState) {
    gsawDB.updateAnnouncement(id, { is_active: newState }).then(renderAnnouncements);
}

function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    gsawDB.deleteAnnouncement(id).then(renderAnnouncements);
}

// ========================================
// CMS — EVENTS
// ========================================
function renderCmsEvents() {
    cmsLoading('cms-events-list');
    gsawDB.getCmsEvents().then(function(items) {
        if (!items || !items.length) { cmsEmpty('cms-events-list', 'No events yet. Click "New Event" to add one.'); return; }
        var html = '<table style="width:100%;border-collapse:collapse;font-size:0.83rem;">';
        html += '<thead><tr style="border-bottom:2px solid #e5e7eb;">' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Title</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Type</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Date</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Location</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Status</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#6c757d;font-weight:600;">Actions</th></tr></thead><tbody>';
        items.forEach(function(ev) {
            var badge = ev.is_archived
                ? '<span style="background:#f3f4f6;color:#6b7280;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Archived</span>'
                : '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Live</span>';
            var dateStr = ev.event_date ? new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-ZA') : '—';
            html += '<tr style="border-bottom:1px solid #f3f4f6;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'\'">' +
                '<td style="padding:10px 12px;font-weight:600;">' + cmsEsc(ev.title) + '</td>' +
                '<td style="padding:10px 12px;text-transform:capitalize;">' + (ev.event_type || '—') + '</td>' +
                '<td style="padding:10px 12px;">' + dateStr + '</td>' +
                '<td style="padding:10px 12px;">' + cmsEsc(ev.location || '—') + '</td>' +
                '<td style="padding:10px 12px;">' + badge + '</td>' +
                '<td style="padding:10px 12px;text-align:right;white-space:nowrap;">' +
                '<button onclick="openCmsModal(\'event\',' + JSON.stringify(ev).replace(/"/g,'&quot;') + ')" style="padding:5px 12px;border:none;background:#e5e7eb;color:#374151;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;"><i class="fas fa-edit"></i></button>' +
                '<button onclick="toggleCmsEvent(\'' + ev.id + '\',' + !ev.is_archived + ')" style="padding:5px 12px;border:none;background:#fef3c7;color:#374151;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;" title="' + (ev.is_archived ? 'Unarchive' : 'Archive') + '"><i class="fas fa-archive"></i></button>' +
                '<button onclick="deleteCmsEvent(\'' + ev.id + '\',\'' + cmsEsc(ev.image_path || '') + '\')" style="padding:5px 12px;border:none;background:#fee2e2;color:#E31E24;border-radius:6px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('cms-events-list').innerHTML = html;
    }).catch(function() { cmsEmpty('cms-events-list', 'Failed to load. Try refreshing.'); });
}

function toggleCmsEvent(id, archiveState) {
    gsawDB.updateCmsEvent(id, { is_archived: archiveState }).then(renderCmsEvents);
}

function deleteCmsEvent(id, imagePath) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    gsawDB.deleteCmsEvent(id).then(function() {
        if (imagePath) gsawDB.deleteStorageFile(imagePath);
        renderCmsEvents();
    });
}

// ========================================
// CMS — NEWS
// ========================================
function renderCmsNews() {
    cmsLoading('cms-news-list');
    gsawDB.getCmsNews().then(function(items) {
        if (!items || !items.length) { cmsEmpty('cms-news-list', 'No articles yet. Click "New Article" to add one.'); return; }
        var html = '<table style="width:100%;border-collapse:collapse;font-size:0.83rem;">';
        html += '<thead><tr style="border-bottom:2px solid #e5e7eb;">' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Title</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Category</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Author</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Published</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#6c757d;font-weight:600;">Status</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#6c757d;font-weight:600;">Actions</th></tr></thead><tbody>';
        items.forEach(function(a) {
            var badge = a.is_published
                ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Published</span>'
                : '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">Draft</span>';
            var pubDate = a.published_at ? new Date(a.published_at).toLocaleDateString('en-ZA') : '—';
            html += '<tr style="border-bottom:1px solid #f3f4f6;" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'\'">' +
                '<td style="padding:10px 12px;font-weight:600;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + cmsEsc(a.title) + '</td>' +
                '<td style="padding:10px 12px;">' + cmsEsc(a.category || '—') + '</td>' +
                '<td style="padding:10px 12px;">' + cmsEsc(a.author || '—') + '</td>' +
                '<td style="padding:10px 12px;">' + pubDate + '</td>' +
                '<td style="padding:10px 12px;">' + badge + '</td>' +
                '<td style="padding:10px 12px;text-align:right;white-space:nowrap;">' +
                '<button onclick="openCmsModal(\'news\',' + JSON.stringify(a).replace(/"/g,'&quot;') + ')" style="padding:5px 12px;border:none;background:#e5e7eb;color:#374151;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;"><i class="fas fa-edit"></i></button>' +
                '<button onclick="toggleCmsNews(\'' + a.id + '\',' + !a.is_published + ')" style="padding:5px 12px;border:none;background:#dbeafe;color:#1d4ed8;border-radius:6px;cursor:pointer;font-size:0.78rem;margin-right:4px;" title="' + (a.is_published ? 'Unpublish' : 'Publish') + '"><i class="fas fa-' + (a.is_published ? 'eye-slash' : 'eye') + '"></i></button>' +
                '<button onclick="deleteCmsNews(\'' + a.id + '\',\'' + cmsEsc(a.cover_image_path || '') + '\')" style="padding:5px 12px;border:none;background:#fee2e2;color:#E31E24;border-radius:6px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('cms-news-list').innerHTML = html;
    }).catch(function() { cmsEmpty('cms-news-list', 'Failed to load. Try refreshing.'); });
}

function toggleCmsNews(id, publishState) {
    gsawDB.updateCmsNews(id, { is_published: publishState }).then(renderCmsNews);
}

function deleteCmsNews(id, imagePath) {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    gsawDB.deleteCmsNews(id).then(function() {
        if (imagePath) gsawDB.deleteStorageFile(imagePath);
        renderCmsNews();
    });
}

// ========================================
// CMS — GALLERY
// ========================================
function renderCmsGallery() {
    var grid = document.getElementById('cms-gallery-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;"></i></div>';
    gsawDB.getGalleryPhotos().then(function(items) {
        if (!items || !items.length) {
            grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;grid-column:1/-1;"><i class="fas fa-images" style="font-size:2rem;"></i><p style="margin-top:10px;font-size:0.85rem;">No photos yet. Select an album and click "Upload Photos".</p></div>';
            return;
        }
        var html = '';
        items.forEach(function(p) {
            html += '<div style="position:relative;border-radius:10px;overflow:hidden;background:#f3f4f6;aspect-ratio:1;box-shadow:0 2px 6px rgba(0,0,0,0.08);">' +
                '<img src="' + p.image_url + '" alt="' + cmsEsc(p.caption || '') + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' +
                '<div style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background 0.2s;" onmouseover="this.style.background=\'rgba(0,0,0,0.4)\';this.querySelector(\'.gallery-actions\').style.opacity=\'1\'" onmouseout="this.style.background=\'rgba(0,0,0,0)\';this.querySelector(\'.gallery-actions\').style.opacity=\'0\'">' +
                '<div class="gallery-actions" style="opacity:0;transition:opacity 0.2s;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:6px;align-items:center;">' +
                (p.caption ? '<div style="background:rgba(0,0,0,0.7);color:#fff;font-size:0.72rem;padding:3px 8px;border-radius:4px;max-width:130px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + cmsEsc(p.caption) + '</div>' : '') +
                '<button onclick="deleteCmsGalleryPhoto(\'' + p.id + '\',\'' + cmsEsc(p.image_path) + '\')" style="padding:6px 14px;border:none;background:#E31E24;color:#fff;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;"><i class="fas fa-trash"></i> Delete</button>' +
                '</div></div></div>';
        });
        grid.innerHTML = html;
    }).catch(function() {
        grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;grid-column:1/-1;">Failed to load. Try refreshing.</div>';
    });
}

function handleGalleryUpload(input) {
    var files = Array.from(input.files);
    if (!files.length) return;
    var album = document.getElementById('gallery-album-input').value || 'General';
    var progressWrap = document.getElementById('gallery-upload-progress');
    var progressBar = document.getElementById('gallery-progress-bar');
    var progressText = document.getElementById('gallery-progress-text');
    progressWrap.style.display = 'block';
    var total = files.length;
    var done = 0;
    var maxMB = 5;

    function uploadNext(i) {
        if (i >= files.length) {
            progressText.textContent = 'All photos uploaded!';
            progressBar.style.width = '100%';
            setTimeout(function() { progressWrap.style.display = 'none'; progressBar.style.width = '0%'; }, 2000);
            input.value = '';
            renderCmsGallery();
            return;
        }
        var file = files[i];
        if (file.size > maxMB * 1024 * 1024) {
            progressText.textContent = 'Skipping ' + file.name + ' (over ' + maxMB + 'MB)';
            done++;
            progressBar.style.width = Math.round((done / total) * 100) + '%';
            uploadNext(i + 1);
            return;
        }
        progressText.textContent = 'Uploading ' + (i + 1) + ' of ' + total + ': ' + file.name;
        gsawDB.cmsUploadFile(file, 'gallery').then(function(result) {
            return gsawDB.addGalleryPhoto({ image_url: result.url, image_path: result.path, album: album, caption: '', display_order: 0 });
        }).then(function() {
            done++;
            progressBar.style.width = Math.round((done / total) * 100) + '%';
            uploadNext(i + 1);
        }).catch(function() {
            done++;
            progressText.textContent = 'Failed to upload: ' + file.name;
            progressBar.style.width = Math.round((done / total) * 100) + '%';
            uploadNext(i + 1);
        });
    }
    uploadNext(0);
}

function deleteCmsGalleryPhoto(id, imagePath) {
    if (!confirm('Delete this photo permanently?')) return;
    gsawDB.deleteGalleryPhoto(id).then(function() {
        if (imagePath) gsawDB.deleteStorageFile(imagePath);
        renderCmsGallery();
    });
}

// ========================================
// CMS — LEADERS
// ========================================
function renderCmsLeaders() {
    var grid = document.getElementById('cms-leaders-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;"></i></div>';
    gsawDB.getCmsLeaders().then(function(items) {
        if (!items || !items.length) {
            grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;grid-column:1/-1;"><i class="fas fa-users" style="font-size:2rem;"></i><p style="margin-top:10px;font-size:0.85rem;">No leaders yet. Click "Add Leader" to add one.</p></div>';
            return;
        }
        var html = '';
        items.forEach(function(l) {
            var avatarHtml = l.photo_url
                ? '<img src="' + l.photo_url + '" alt="' + cmsEsc(l.name) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ' + (l.is_primary ? '#E31E24' : '#1B7A3D') + ';margin:0 auto 12px;display:block;" onerror="this.style.display=\'none\'">'
                : '<div style="width:80px;height:80px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="fas fa-user" style="color:#9ca3af;font-size:1.8rem;"></i></div>';
            var primaryBadge = l.is_primary ? '<span style="background:#fee2e2;color:#E31E24;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:6px;">Primary</span>' : '';
            var activeBadge = l.is_active
                ? '<span style="background:#d1fae5;color:#065f46;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:600;">Active</span>'
                : '<span style="background:#f3f4f6;color:#6b7280;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:600;">Hidden</span>';
            html += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.05);">' +
                avatarHtml +
                '<div style="font-weight:700;font-size:0.9rem;color:#111827;">' + cmsEsc(l.name) + primaryBadge + '</div>' +
                '<div style="font-size:0.8rem;color:#6c757d;margin-top:3px;">' + cmsEsc(l.title) + '</div>' +
                '<div style="margin-top:8px;">' + activeBadge + '</div>' +
                '<div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">' +
                '<button onclick="openCmsModal(\'leader\',' + JSON.stringify(l).replace(/"/g,'&quot;') + ')" style="flex:1;padding:7px;border:none;background:#e5e7eb;color:#374151;border-radius:8px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-edit"></i> Edit</button>' +
                '<button onclick="deleteCmsLeader(\'' + l.id + '\',\'' + cmsEsc(l.photo_path || '') + '\')" style="padding:7px 12px;border:none;background:#fee2e2;color:#E31E24;border-radius:8px;cursor:pointer;font-size:0.78rem;"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
        grid.innerHTML = html;
    }).catch(function() {
        grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#9ca3af;grid-column:1/-1;">Failed to load. Try refreshing.</div>';
    });
}

function deleteCmsLeader(id, photoPath) {
    if (!confirm('Delete this leader? This cannot be undone.')) return;
    gsawDB.deleteCmsLeader(id).then(function() {
        if (photoPath) gsawDB.deleteStorageFile(photoPath);
        renderCmsLeaders();
    });
}

