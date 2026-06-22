/* ========================================
   GSAW Supabase Configuration
   Replace the values below with your Supabase project credentials
   Found at: https://supabase.com/dashboard > Settings > API
======================================== */

var SUPABASE_URL = 'https://nvgoaikzidtpyvmffmxq.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable__cGi8xiV0Il-9tAan7QUAQ_wqQY_Q0K';

// Email notification helper (calls Supabase Edge Function)
// To enable: Deploy the notify-admin edge function in Supabase Dashboard
var gsawNotify = {
    sendAdminAlert: function (type, data) {
        return fetch(SUPABASE_URL + '/functions/v1/notify-admin', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: type, data: data })
        }).catch(function () { /* silently fail - notifications are non-critical */ });
    }
};

// ========================================
// SUPABASE CLIENT HELPER
// ========================================
var gsawDB = {
    headers: function () {
        return {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    },

    // ---- MEMBERSHIPS ----
    getMemberships: function () {
        return fetch(SUPABASE_URL + '/rest/v1/memberships?order=created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addMembership: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/memberships', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateMembership: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/memberships?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteMembership: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/memberships?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- DONATIONS ----
    getDonations: function () {
        return fetch(SUPABASE_URL + '/rest/v1/donations?order=created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addDonation: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/donations', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateDonation: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/donations?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteDonation: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/donations?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- FILE STORAGE ----
    uploadFile: function (bucket, filePath, file) {
        return fetch(SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + filePath, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'true'
            },
            body: file
        }).then(function (r) { return r.json(); });
    },

    getFileUrl: function (bucket, filePath) {
        return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + filePath;
    },

    // ---- DUPLICATE CHECKS ----
    checkMembershipExists: function (field, value) {
        return fetch(SUPABASE_URL + '/rest/v1/memberships?select=id&' + field + '=eq.' + encodeURIComponent(value), {
            headers: this.headers()
        }).then(function (r) { return r.json(); })
          .then(function (rows) { return rows.length > 0; });
    },

    // ---- VOLUNTEERS ----
    addVolunteer: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/volunteers', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    getVolunteers: function () {
        return fetch(SUPABASE_URL + '/rest/v1/volunteers?order=created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    // ---- CONTACT MESSAGES ----
    addContactMessage: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/contact_messages', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    getContactMessages: function () {
        return fetch(SUPABASE_URL + '/rest/v1/contact_messages?order=created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    // ---- CMS STORAGE HELPERS ----

    // Delete a file from gsaw-media bucket by its path (e.g. "events/123_photo.jpg")
    deleteStorageFile: function (path) {
        if (!path) return Promise.resolve();
        return fetch(SUPABASE_URL + '/storage/v1/object/gsaw-media/' + path, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
            }
        });
    },

    // Upload a file to gsaw-media bucket under a given folder.
    // Generates a unique path: folder/timestamp_sanitizedname
    // Returns Promise<{path: string, url: string}>
    cmsUploadFile: function (file, folder) {
        var sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        var path = folder + '/' + Date.now() + '_' + sanitized;
        var self = this;
        return fetch(SUPABASE_URL + '/storage/v1/object/gsaw-media/' + path, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'false'
            },
            body: file
        }).then(function (r) {
            if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || 'Upload failed'); });
            return { path: path, url: self.getFileUrl('gsaw-media', path) };
        });
    },

    // ---- SITE ANNOUNCEMENTS ----
    getAnnouncements: function () {
        return fetch(SUPABASE_URL + '/rest/v1/site_announcements?order=created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addAnnouncement: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_announcements', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateAnnouncement: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_announcements?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteAnnouncement: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/site_announcements?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- SITE EVENTS ----
    getCmsEvents: function () {
        return fetch(SUPABASE_URL + '/rest/v1/site_events?order=event_date.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addCmsEvent: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_events', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateCmsEvent: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_events?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteCmsEvent: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/site_events?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- SITE NEWS ----
    getCmsNews: function () {
        return fetch(SUPABASE_URL + '/rest/v1/site_news?order=published_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addCmsNews: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_news', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateCmsNews: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_news?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteCmsNews: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/site_news?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- GALLERY PHOTOS ----
    getGalleryPhotos: function () {
        return fetch(SUPABASE_URL + '/rest/v1/gallery_photos?order=display_order.asc,created_at.desc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addGalleryPhoto: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/gallery_photos', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteGalleryPhoto: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/gallery_photos?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    },

    // ---- SITE LEADERS ----
    getCmsLeaders: function () {
        return fetch(SUPABASE_URL + '/rest/v1/site_leaders?order=display_order.asc', {
            headers: this.headers()
        }).then(function (r) { return r.json(); });
    },

    addCmsLeader: function (data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_leaders', {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    updateCmsLeader: function (id, data) {
        return fetch(SUPABASE_URL + '/rest/v1/site_leaders?id=eq.' + id, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    },

    deleteCmsLeader: function (id) {
        return fetch(SUPABASE_URL + '/rest/v1/site_leaders?id=eq.' + id, {
            method: 'DELETE',
            headers: this.headers()
        });
    }
};
