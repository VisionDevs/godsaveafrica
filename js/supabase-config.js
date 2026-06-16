/* ========================================
   GSAW Supabase Configuration
   Replace the values below with your Supabase project credentials
   Found at: https://supabase.com/dashboard > Settings > API
======================================== */

var SUPABASE_URL = 'https://nvgoaikzidtpyvmffmxq.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable__cGi8xiV0Il-9tAan7QUAQ_wqQY_Q0K';

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
    }
};
