/* ========================================
   GSAW CMS — Public-facing content loader
   Dynamically loads Announcements, Events, News, Gallery, and Leaders
   from Supabase into the public website pages.
======================================== */

(function () {
    'use strict';

    var CMS_URL = 'https://nvgoaikzidtpyvmffmxq.supabase.co';
    var CMS_KEY = 'sb_publishable__cGi8xiV0Il-9tAan7QUAQ_wqQY_Q0K';

    function cmsGet(table, query) {
        return fetch(CMS_URL + '/rest/v1/' + table + '?' + (query || ''), {
            headers: {
                'apikey': CMS_KEY,
                'Authorization': 'Bearer ' + CMS_KEY
            }
        }).then(function (r) { return r.json(); });
    }

    function escHtml(str) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(String(str || '')));
        return d.innerHTML;
    }

    // ---- ANNOUNCEMENT BANNER ----
    function loadAnnouncementBanner() {
        var now = new Date().toISOString();
        var q = 'is_active=eq.true&or=(end_date.is.null,end_date.gte.' + now + ')&start_date=lte.' + now + '&order=created_at.desc&limit=1';
        cmsGet('site_announcements', q).then(function (items) {
            if (!items || !items.length) return;
            var a = items[0];
            var colorMap = { green: '#1B7A3D', orange: '#F47920', red: '#E31E24' };
            var bg = colorMap[a.color] || colorMap.green;
            var bar = document.createElement('div');
            bar.id = 'gsaw-announcement-bar';
            bar.style.cssText = 'background:' + bg + ';color:#fff;text-align:center;padding:9px 20px;font-size:0.84rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;position:relative;z-index:500;line-height:1.4;';

            var inner = '';
            if (a.show_countdown && a.countdown_date) {
                inner += '<span id="gsaw-countdown-badge" style="background:rgba(0,0,0,0.25);color:#fff;padding:2px 10px;border-radius:20px;font-family:monospace;font-size:0.82rem;letter-spacing:0.02em;"></span>';
            }
            inner += '<span>' + escHtml(a.message) + '</span>';
            if (a.link_url) {
                inner += '<a href="' + escHtml(a.link_url) + '" target="_blank" rel="noopener" style="background:rgba(255,255,255,0.25);color:#fff;padding:3px 14px;border-radius:20px;text-decoration:none;font-size:0.8rem;white-space:nowrap;">' + escHtml(a.link_text || 'Learn More') + ' &rarr;</a>';
            }
            bar.innerHTML = inner;

            var topBar = document.querySelector('.top-bar');
            if (topBar && topBar.parentNode) {
                topBar.parentNode.insertBefore(bar, topBar.nextSibling);
            } else {
                document.body.insertBefore(bar, document.body.firstChild);
            }

            if (a.show_countdown && a.countdown_date) {
                var target = new Date(a.countdown_date);
                function tick() {
                    var badge = document.getElementById('gsaw-countdown-badge');
                    if (!badge) return;
                    var diff = target - new Date();
                    if (diff <= 0) { badge.textContent = 'Now!'; return; }
                    var d = Math.floor(diff / 86400000);
                    var h = Math.floor((diff % 86400000) / 3600000);
                    var m = Math.floor((diff % 3600000) / 60000);
                    var s = Math.floor((diff % 60000) / 1000);
                    badge.textContent = d + 'd ' + String(h).padStart(2, '0') + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's';
                }
                tick();
                setInterval(tick, 1000);
            }
        }).catch(function () { /* non-critical, fail silently */ });
    }

    // ---- EVENTS PAGE ----
    function loadCmsEvents() {
        var container = document.getElementById('events-grid');
        if (!container) return;
        cmsGet('site_events', 'is_archived=eq.false&order=event_date.asc').then(function (events) {
            if (!events || !events.length) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#9ca3af;"><i class="fas fa-calendar-times" style="font-size:3rem;"></i><p style="margin-top:16px;font-size:1rem;">No upcoming events at this time.<br>Please check back soon!</p></div>';
                return;
            }
            var html = '';
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            events.forEach(function (ev) {
                var evDate = new Date(ev.event_date + 'T00:00:00');
                var isPast = evDate < today;
                var isToday = evDate.toDateString() === today.toDateString();
                var day = evDate.getDate();
                var monthStr = evDate.toLocaleDateString('en-ZA', { month: 'short' });
                var typeLabel = (ev.event_type || 'Event').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
                var headerStyle = ev.image_url
                    ? 'min-height:160px;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.5) 60%,rgba(0,0,0,0.3) 100%),url(' + ev.image_url + ') center/cover no-repeat;'
                    : 'min-height:160px;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;background:linear-gradient(135deg,#1a1a2e,#1B7A3D);';
                var statusClass = isPast ? 'past' : isToday ? 'today' : 'upcoming';
                var statusLabel = isPast ? 'Past Event' : isToday ? 'Happening Today!' : 'Upcoming';
                html += '<div class="event-card" data-type="' + escHtml(ev.event_type || 'general') + '">';
                html += '<div class="event-header" style="' + headerStyle + '">';
                html += '<div class="event-date-badge"><span class="day">' + day + '</span>' + monthStr + '</div>';
                html += '<span class="event-type">' + escHtml(typeLabel) + '</span>';
                html += '<h3>' + escHtml(ev.title) + '</h3>';
                html += '</div>';
                html += '<div class="event-body">';
                html += '<div class="event-meta-item"><i class="fas fa-calendar"></i> ' + evDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div>';
                if (ev.event_time) html += '<div class="event-meta-item"><i class="fas fa-clock"></i> ' + escHtml(ev.event_time) + '</div>';
                if (ev.location) html += '<div class="event-meta-item"><i class="fas fa-map-marker-alt"></i> ' + escHtml(ev.location) + '</div>';
                if (ev.description) html += '<p class="event-description">' + escHtml(ev.description) + '</p>';
                html += '</div>';
                html += '<div class="event-footer">';
                html += '<span class="event-status status-' + statusClass + '">' + statusLabel + '</span>';
                if (ev.link_url) html += '<a href="' + escHtml(ev.link_url) + '" target="_blank" rel="noopener" class="event-btn event-btn-primary">' + escHtml(ev.link_text || 'More Info') + '</a>';
                html += '</div>';
                html += '</div>';
            });
            container.innerHTML = html;
        }).catch(function () { /* fail silently */ });
    }

    // ---- NEWS PAGE ----
    function loadCmsNews() {
        var container = document.getElementById('news-grid') || document.querySelector('.news-grid');
        if (!container) return;
        cmsGet('site_news', 'is_published=eq.true&order=published_at.desc').then(function (articles) {
            if (!articles || !articles.length) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#9ca3af;"><i class="fas fa-newspaper" style="font-size:3rem;"></i><p style="margin-top:16px;">No articles yet.</p></div>';
                return;
            }
            var html = '';
            articles.forEach(function (a) {
                var pubDate = new Date(a.published_at || a.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
                var linkOpen = a.link_url ? '<a href="' + escHtml(a.link_url) + '">' : '';
                var linkClose = a.link_url ? '</a>' : '';
                var imgHtml = a.cover_image_url
                    ? '<img src="' + escHtml(a.cover_image_url) + '" alt="' + escHtml(a.title) + '" class="news-image">'
                    : '<div class="news-image-placeholder"><i class="fas fa-newspaper"></i></div>';
                html += '<div class="news-card">';
                html += linkOpen;
                html += imgHtml;
                html += '<div class="news-body">';
                html += '<div class="news-meta"><span class="news-tag">' + escHtml(a.category || 'News') + '</span><span class="news-date-text">' + pubDate + '</span></div>';
                html += '<h3>' + escHtml(a.title) + '</h3>';
                if (a.summary) html += '<p>' + escHtml(a.summary) + '</p>';
                if (a.link_url) html += '<span class="news-link">' + escHtml(a.link_text || 'Read More') + ' <i class="fas fa-arrow-right"></i></span>';
                html += '</div>';
                html += linkClose;
                html += '</div>';
            });
            container.innerHTML = html;
        }).catch(function () { /* fail silently */ });
    }

    // ---- GALLERY PAGE ----
    function loadCmsGallery() {
        var container = document.querySelector('.gallery-grid');
        if (!container) return;
        cmsGet('gallery_photos', 'order=display_order.asc,created_at.desc').then(function (photos) {
            if (!photos || !photos.length) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#9ca3af;"><i class="fas fa-images" style="font-size:3rem;"></i><p style="margin-top:16px;">No photos yet.</p></div>';
                return;
            }
            var html = '';
            photos.forEach(function (p) {
                var cat = (p.album || 'General').toLowerCase();
                html += '<div class="gallery-item" data-category="' + escHtml(cat) + '" onclick="openLightbox && openLightbox(this)">';
                html += '<img src="' + escHtml(p.image_url) + '" alt="' + escHtml(p.caption || 'GSAW Gallery') + '" loading="lazy">';
                if (p.caption) {
                    html += '<div class="gallery-overlay"><p>' + escHtml(p.caption) + '</p></div>';
                }
                html += '</div>';
            });
            container.innerHTML = html;
        }).catch(function () { /* fail silently */ });
    }

    // ---- LEADERSHIP PAGE ----
    function loadCmsLeaders() {
        var dynamicContainer = document.getElementById('dynamic-leaders');
        if (!dynamicContainer) return;
        cmsGet('site_leaders', 'is_active=eq.true&order=display_order.asc').then(function (leaders) {
            if (!leaders || !leaders.length) {
                // No DB leaders — show static content
                var sc = document.getElementById('leaders-static-content');
                if (sc) sc.style.opacity = '1';
                return;
            }
            // Hide hardcoded leaders and show CMS-managed section
            var staticContent = document.getElementById('leaders-static-content');
            if (staticContent) staticContent.style.display = 'none';
            var section = document.getElementById('dynamic-leaders-section');
            if (section) section.style.display = '';
            var html = '';
            leaders.forEach(function (l) {
                var cls = 'leader-card' + (l.is_primary ? ' leader-primary' : '');
                var photoHtml = l.photo_url
                    ? '<div class="leader-avatar"><img src="' + escHtml(l.photo_url) + '" alt="' + escHtml(l.name) + '" onerror="this.parentElement.innerHTML=\'<i class=\\\"fas fa-user\\\"></i>\';"></div>'
                    : '<div class="leader-avatar" style="background:#e5e7eb;"><i class="fas fa-user" style="color:#9ca3af;font-size:2rem;"></i></div>';
                html += '<div class="' + cls + '">';
                html += photoHtml;
                html += '<div class="leader-info">';
                html += '<h3>' + escHtml(l.title) + '</h3>';
                html += '<p class="leader-name">' + escHtml(l.name) + '</p>';
                if (l.bio) html += '<p class="leader-desc">' + escHtml(l.bio) + '</p>';
                html += '</div></div>';
            });
            dynamicContainer.innerHTML = html;
        }).catch(function () {
            // Failed to load — show static content
            var sc = document.getElementById('leaders-static-content');
            if (sc) sc.style.opacity = '1';
        });
    }

    // ---- AUTO-INIT on DOM ready ----
    function init() {
        loadAnnouncementBanner();
        loadCmsEvents();
        loadCmsNews();
        loadCmsGallery();
        loadCmsLeaders();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
