/* ========================================
   GSAW - God Save Africa & The World
   Main JavaScript
   Handles: Navigation, Form, Animations, Admin link
======================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ========================================
    // 1. MOBILE NAVIGATION
    // ========================================
    var navToggle = document.getElementById('nav-toggle');
    var navMenu = document.getElementById('nav-menu');
    var navLinks = document.querySelectorAll('.nav-link');

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close menu on link click
    navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // Close menu on outside click
    document.addEventListener('click', function (e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });

    // ========================================
    // 2. NAVBAR SCROLL EFFECT
    // ========================================
    var navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ========================================
    // 3. ACTIVE NAV LINK ON SCROLL
    // ========================================
    var sections = document.querySelectorAll('section[id]');

    function updateActiveLink() {
        var scrollY = window.pageYOffset;

        sections.forEach(function (section) {
            var sectionHeight = section.offsetHeight;
            var sectionTop = section.offsetTop - 120;
            var sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(function (link) {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);

    // ========================================
    // 4. BACK TO TOP BUTTON
    // ========================================
    var backToTop = document.getElementById('backToTop');

    if (backToTop) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ========================================
    // 5. SCROLL ANIMATIONS
    // ========================================
    var observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    };

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    var animateSelectors = [
        '.stat-card', '.value-card', '.contact-card',
        '.about-content', '.about-cards', '.info-card',
        '.election-card', '.manifesto-card', '.leader-card',
        '.news-card', '.doc-card', '.join-info', '.join-form-wrapper',
        '.cta-box'
    ];

    animateSelectors.forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (el) {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    });

    // ========================================
    // 6. SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            var target = document.querySelector(href);
            if (target) {
                var offset = navbar.offsetHeight + 20;
                var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    // ========================================
    // 7. MEMBERSHIP FORM HANDLING
    // ========================================
    var form = document.getElementById('membership-form');
    var submitBtn = document.getElementById('submit-btn');
    var formSuccess = document.getElementById('form-success');

    // Rate limiting: prevent spam submissions (max 1 per 60 seconds)
    var lastSubmitTime = 0;
    var SUBMIT_COOLDOWN = 60000; // 60 seconds

    // ID Number → Date of Birth auto-populate
    var idInput = document.getElementById('idNumber');
    var dobInput = document.getElementById('dob');
    if (idInput && dobInput) {
        idInput.addEventListener('input', function () {
            var id = this.value.replace(/\D/g, '');
            this.value = id; // strip non-digits
            if (id.length >= 6) {
                var year = parseInt(id.substring(0, 2));
                var month = id.substring(2, 4);
                var day = id.substring(4, 6);
                // Determine century: if year > 25, assume 1900s, else 2000s
                var fullYear = year > 25 ? '19' + (year < 10 ? '0' + year : year) : '20' + (year < 10 ? '0' + year : year);
                // Validate month and day
                var monthNum = parseInt(month);
                var dayNum = parseInt(day);
                if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
                    dobInput.value = fullYear + '-' + month + '-' + day;
                }
            }
            // Validate Luhn check digit when full 13 digits entered
            if (id.length === 13) {
                if (!validateSAID(id)) {
                    this.classList.add('error');
                    showNotification('Invalid SA ID number. Please check and try again.', 'error');
                } else {
                    this.classList.remove('error');
                    // Auto-detect gender from ID
                    var genderDigits = parseInt(id.substring(6, 10));
                    var genderSelect = document.getElementById('gender');
                    if (genderSelect) {
                        genderSelect.value = genderDigits >= 5000 ? 'Male' : 'Female';
                    }
                    // Check if ID already registered (on blur)
                    checkDuplicateOnBlur('id_number', id, idInput, 'This ID number is already registered. You are already a member!');
                }
            }
        });
    }

    // ========================================
    // DUPLICATE CHECK ON BLUR (instant feedback)
    // ========================================
    var duplicateCheckTimer = null;
    function checkDuplicateOnBlur(field, value, inputEl, message) {
        if (!value) return;
        gsawDB.checkMembershipExists(field, value).then(function (exists) {
            if (exists) {
                inputEl.classList.add('error');
                showNotification(message, 'error');
            }
        }).catch(function () { /* ignore network errors */ });
    }

    // Email blur check
    var emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            var val = this.value.trim();
            if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                checkDuplicateOnBlur('email', val, this, 'This email address is already registered. Please use a different email.');
            }
        });
    }

    // Phone blur check
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function () {
            var val = this.value.replace(/[\s\-()]/g, '');
            if (val.length >= 10) {
                checkDuplicateOnBlur('phone', val, this, 'This phone number is already registered. Please use a different number.');
            }
        });
    }

    // ========================================
    // PROVINCE → MUNICIPALITY CASCADE
    // ========================================
    var provinceMunicipalities = {
        'Eastern Cape': ['Alfred Nzo', 'Amathole', 'Buffalo City', 'Chris Hani', 'Joe Gqabi', 'Nelson Mandela Bay', 'OR Tambo', 'Sarah Baartman'],
        'Free State': ['Fezile Dabi', 'Lejweleputswa', 'Mangaung', 'Thabo Mofutsanyana', 'Xhariep'],
        'Gauteng': ['City of Ekurhuleni', 'City of Johannesburg', 'City of Tshwane', 'Sedibeng', 'West Rand'],
        'KwaZulu-Natal': ['Amajuba', 'eThekwini', 'Harry Gwala', 'iLembe', 'King Cetshwayo', 'Ugu', 'uMgungundlovu', 'uMkhanyakude', 'uMzinyathi', 'uThukela', 'Zululand'],
        'Limpopo': ['Capricorn', 'Mopani', 'Sekhukhune', 'Vhembe', 'Waterberg'],
        'Mpumalanga': ['Ehlanzeni', 'Gert Sibande', 'Nkangala'],
        'North West': ['Bojanala Platinum', 'Dr Kenneth Kaunda', 'Dr Ruth Segomotsi Mompati', 'Ngaka Modiri Molema'],
        'Northern Cape': ['Frances Baard', 'John Taolo Gaetsewe', 'Namakwa', 'Pixley ka Seme', 'ZF Mgcawu'],
        'Western Cape': ['Cape Winelands', 'Central Karoo', 'City of Cape Town', 'Garden Route', 'Overberg', 'West Coast']
    };

    var provinceSelect = document.getElementById('province');
    var municipalityInput = document.getElementById('municipality');
    if (provinceSelect && municipalityInput) {
        // Replace text input with select dropdown
        var municipalitySelect = document.createElement('select');
        municipalitySelect.id = 'municipality';
        municipalitySelect.name = 'municipality';
        municipalitySelect.required = true;
        municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
        municipalityInput.parentNode.replaceChild(municipalitySelect, municipalityInput);

        provinceSelect.addEventListener('change', function () {
            var province = this.value;
            var municipalities = provinceMunicipalities[province] || [];
            var html = '<option value="">Select Municipality</option>';
            municipalities.forEach(function (m) {
                html += '<option value="' + m + '">' + m + '</option>';
            });
            municipalitySelect.innerHTML = html;
        });
    }

    // SA ID Luhn validation
    function validateSAID(id) {
        if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            var digit = parseInt(id[i]);
            if (i % 2 === 0) {
                sum += digit;
            } else {
                var doubled = digit * 2;
                sum += doubled > 9 ? doubled - 9 : doubled;
            }
        }
        var checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(id[12]);
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Honeypot anti-bot check
            var honeypot = document.getElementById('honeypot-field');
            if (honeypot && honeypot.value) {
                // Bot detected - silently reject
                form.style.display = 'none';
                formSuccess.style.display = 'block';
                return;
            }

            // Rate limiting check
            var now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
                var waitSecs = Math.ceil((SUBMIT_COOLDOWN - (now - lastSubmitTime)) / 1000);
                showNotification('Please wait ' + waitSecs + ' seconds before submitting again.', 'error');
                return;
            }
            lastSubmitTime = now;

            // Clear previous errors
            form.querySelectorAll('.error').forEach(function (el) {
                el.classList.remove('error');
            });

            // Validate
            if (!validateForm()) {
                return;
            }

            // Show loading
            var btnText = submitBtn.querySelector('.btn-text');
            var btnLoading = submitBtn.querySelector('.btn-loading');
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            submitBtn.disabled = true;

            // Check for duplicates before submitting
            var idNumber = getValue('idNumber');
            var email = getValue('email');
            var phone = getValue('phone').replace(/[\s\-()]/g, '');

            Promise.all([
                gsawDB.checkMembershipExists('id_number', idNumber),
                gsawDB.checkMembershipExists('email', email),
                gsawDB.checkMembershipExists('phone', phone)
            ]).then(function (results) {
                var idExists = results[0];
                var emailExists = results[1];
                var phoneExists = results[2];

                if (idExists) {
                    document.getElementById('idNumber').classList.add('error');
                    showNotification('This ID number is already registered. You are already a member!', 'error');
                    resetButton();
                    return;
                }
                if (emailExists) {
                    document.getElementById('email').classList.add('error');
                    showNotification('This email address is already registered. Please use a different email.', 'error');
                    resetButton();
                    return;
                }
                if (phoneExists) {
                    document.getElementById('phone').classList.add('error');
                    showNotification('This phone number is already registered. Please use a different number.', 'error');
                    resetButton();
                    return;
                }

                // No duplicates — proceed with submission
                var membershipNumber = generateMembershipNumber();
                var formData = {
                    membershipNumber: membershipNumber,
                    firstName: getValue('firstName'),
                    lastName: getValue('lastName'),
                    email: email,
                    phone: phone,
                    idNumber: idNumber,
                    gender: getValue('gender'),
                    dob: getValue('dob'),
                    address: getValue('address'),
                    province: getValue('province'),
                    municipality: getValue('municipality'),
                    ward: getValue('ward'),
                    votingStation: getValue('votingStation'),
                    occupation: getValue('occupation'),
                    qualification: getValue('qualification'),
                    skills: getValue('skills'),
                    reason: getValue('reason'),
                    signature: window.signaturePad ? window.signaturePad.getData() : '',
                    status: 'pending',
                    submittedAt: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
                };

                submitApplication(formData)
                    .then(function (result) {
                        if (result && result.error) {
                            showNotification('Submission failed: ' + result.message, 'error');
                            return;
                        }
                        form.style.display = 'none';
                        formSuccess.style.display = 'block';
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    })
                    .catch(function () {
                        storeLocally(formData);
                        form.style.display = 'none';
                        formSuccess.style.display = 'block';
                    })
                    .finally(function () {
                        resetButton();
                    });
            }).catch(function () {
                // If duplicate check fails (network), proceed anyway and let DB handle it
                var membershipNumber = generateMembershipNumber();
                var formData = {
                    membershipNumber: membershipNumber,
                    firstName: getValue('firstName'),
                    lastName: getValue('lastName'),
                    email: email,
                    phone: phone,
                    idNumber: idNumber,
                    gender: getValue('gender'),
                    dob: getValue('dob'),
                    address: getValue('address'),
                    province: getValue('province'),
                    municipality: getValue('municipality'),
                    ward: getValue('ward'),
                    votingStation: getValue('votingStation'),
                    occupation: getValue('occupation'),
                    qualification: getValue('qualification'),
                    skills: getValue('skills'),
                    reason: getValue('reason'),
                    signature: window.signaturePad ? window.signaturePad.getData() : '',
                    status: 'pending',
                    submittedAt: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
                };

                submitApplication(formData)
                    .then(function () {
                        form.style.display = 'none';
                        formSuccess.style.display = 'block';
                    })
                    .catch(function () {
                        storeLocally(formData);
                        form.style.display = 'none';
                        formSuccess.style.display = 'block';
                    })
                    .finally(function () {
                        resetButton();
                    });
            });

            function resetButton() {
                btnText.style.display = 'inline-flex';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;
            }
        });
    }

    // ========================================
    // 8. FORM VALIDATION
    // ========================================
    function validateForm() {
        var valid = true;

        // Required text fields
        var required = ['firstName', 'lastName', 'email', 'phone', 'idNumber', 'gender', 'dob', 'address', 'province', 'municipality', 'occupation'];
        required.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || !el.value.trim()) {
                if (el) el.classList.add('error');
                valid = false;
            }
        });

        if (!valid) {
            showNotification('Please fill in all required fields.', 'error');
            return false;
        }

        // Email
        var email = document.getElementById('email');
        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            email.classList.add('error');
            showNotification('Please enter a valid email address.', 'error');
            return false;
        }

        // SA ID (13 digits + Luhn check)
        var idNum = document.getElementById('idNumber');
        if (!idNum.value || !/^\d{13}$/.test(idNum.value.trim())) {
            idNum.classList.add('error');
            showNotification('Please enter a valid 13-digit SA ID number.', 'error');
            return false;
        }
        if (!validateSAID(idNum.value.trim())) {
            idNum.classList.add('error');
            showNotification('Invalid SA ID number. The check digit does not match.', 'error');
            return false;
        }

        // Phone (at least 10 digits)
        var phone = document.getElementById('phone');
        var phoneClean = phone.value.replace(/[\s\-()]/g, '');
        if (phoneClean.length < 10) {
            phone.classList.add('error');
            showNotification('Please enter a valid phone number (at least 10 digits).', 'error');
            return false;
        }

        // Checkboxes
        if (!document.getElementById('agree').checked) {
            valid = false;
            showNotification('Please agree to the party principles.', 'error');
            return false;
        }

        if (!document.getElementById('popia').checked) {
            valid = false;
            showNotification('Please accept the POPIA consent.', 'error');
            return false;
        }

        // Signature
        if (window.signaturePad && window.signaturePad.isEmpty()) {
            valid = false;
            var wrapper = document.querySelector('.signature-pad-wrapper');
            if (wrapper) wrapper.classList.add('error');
            showNotification('Please provide your digital signature.', 'error');
            return false;
        }

        if (!valid) {
            showNotification('Please fill in all required fields correctly.', 'error');
        }

        return valid;
    }

    function getValue(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // ========================================
    // 9. SUBMIT APPLICATION (Supabase)
    // ========================================
    function submitApplication(data) {
        var dbRecord = {
            first_name: data.firstName || '',
            last_name: data.lastName || '',
            full_name: (data.firstName || '') + ' ' + (data.lastName || ''),
            id_number: data.idNumber || '',
            date_of_birth: data.dateOfBirth || '',
            gender: data.gender || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            province: data.province || '',
            postal_code: data.postalCode || '',
            municipality: data.municipality || '',
            ward: data.ward || '',
            voting_station: data.votingStation || '',
            occupation: data.occupation || '',
            qualification: data.qualification || '',
            skills: data.skills || '',
            reason: data.reason || '',
            membership_number: data.membershipNumber || '',
            status: 'pending'
        };

        // Upload signature if available
        var signaturePromise;
        if (data.signatureData) {
            var signatureBlob = dataURItoBlob(data.signatureData);
            var sigPath = 'signatures/' + data.membershipNumber + '_signature.png';
            signaturePromise = gsawDB.uploadFile('documents', sigPath, signatureBlob).then(function (result) {
                if (!result.error) {
                    dbRecord.signature_url = gsawDB.getFileUrl('documents', sigPath);
                }
            }).catch(function () { /* continue without signature */ });
        } else {
            signaturePromise = Promise.resolve();
        }

        return signaturePromise.then(function () {
            return gsawDB.addMembership(dbRecord);
        });
    }

    // Helper: convert base64 data URI to Blob
    function dataURItoBlob(dataURI) {
        var parts = dataURI.split(',');
        var mimeMatch = parts[0].match(/:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'image/png';
        var byteString = atob(parts[1]);
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mime });
    }

    // ========================================
    // 10. GENERATE UNIQUE MEMBERSHIP NUMBER
    // ========================================
    function generateMembershipNumber() {
        var year = new Date().getFullYear().toString().slice(-2);
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'GSAW-' + year + '-' + code;
    }

    // ========================================
    // 11. NOTIFICATIONS
    // ========================================
    function showNotification(message, type) {
        // Remove existing
        var existing = document.querySelector('.gsaw-notification');
        if (existing) existing.remove();

        var colors = {
            error: { bg: '#fff5f5', border: '#E31E24', text: '#E31E24', icon: 'fa-exclamation-circle' },
            success: { bg: '#f0fdf4', border: '#1B7A3D', text: '#1B7A3D', icon: 'fa-check-circle' }
        };

        var style = colors[type] || colors.error;

        var el = document.createElement('div');
        el.className = 'gsaw-notification';
        el.innerHTML = '<i class="fas ' + style.icon + '"></i> <span>' + message + '</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:' + style.text + ';font-size:1.2rem;cursor:pointer;margin-left:10px;padding:0 5px;">&times;</button>';
        el.style.cssText =
            'position:fixed; top:20px; left:50%; transform:translateX(-50%); ' +
            'background:' + style.bg + '; color:' + style.text + '; ' +
            'padding:16px 20px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.2); ' +
            'z-index:99999; font-size:0.9rem; font-weight:600; ' +
            'display:flex; align-items:center; gap:10px; ' +
            'border:2px solid ' + style.border + '; ' +
            'animation:slideDown 0.3s ease; max-width:90vw;';

        document.body.appendChild(el);

        setTimeout(function () {
            if (el.parentElement) {
                el.style.opacity = '0';
                el.style.transform = 'translateX(-50%) translateY(-10px)';
                el.style.transition = 'all 0.3s ease';
                setTimeout(function () { if (el.parentElement) el.remove(); }, 300);
            }
        }, 6000);
    }

    // Add animation keyframes
    var styleSheet = document.createElement('style');
    styleSheet.textContent = '@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-15px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
    document.head.appendChild(styleSheet);

});

// ========================================
// 12. RESET FORM (Global function for success screen)
// ========================================
function resetForm() {
    var form = document.getElementById('membership-form');
    var formSuccess = document.getElementById('form-success');
    if (form && formSuccess) {
        form.reset();
        form.style.display = 'block';
        formSuccess.style.display = 'none';
        // Clear signature pad
        if (window.signaturePad) {
            window.signaturePad.clear();
        }
    }
}

// ========================================
// 13. SIGNATURE PAD
// ========================================
(function () {
    var canvas = document.getElementById('signature-pad');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var wrapper = canvas.parentElement;
    var clearBtn = document.getElementById('clear-signature');
    var signatureInput = document.getElementById('signatureData');
    var drawing = false;
    var lastX = 0;
    var lastY = 0;
    var hasSignature = false;

    // Set canvas resolution to match display size
    function resizeCanvas() {
        var rect = canvas.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1a1a2e';
    }

    resizeCanvas();
    window.addEventListener('resize', function () {
        var imgData = hasSignature ? canvas.toDataURL() : null;
        resizeCanvas();
        if (imgData && hasSignature) {
            var img = new Image();
            img.onload = function () {
                ctx.drawImage(img, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
            };
            img.src = imgData;
        }
    });

    function getPosition(e) {
        var rect = canvas.getBoundingClientRect();
        var x, y;
        if (e.touches && e.touches.length > 0) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        return { x: x, y: y };
    }

    function startDraw(e) {
        e.preventDefault();
        drawing = true;
        var pos = getPosition(e);
        lastX = pos.x;
        lastY = pos.y;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        var pos = getPosition(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
        hasSignature = true;
        wrapper.classList.add('signed');
        wrapper.classList.remove('error');
    }

    function stopDraw(e) {
        if (drawing) {
            drawing = false;
            ctx.closePath();
            if (hasSignature && signatureInput) {
                signatureInput.value = canvas.toDataURL('image/png');
            }
        }
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    // Touch events
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    // Clear
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasSignature = false;
            wrapper.classList.remove('signed');
            if (signatureInput) signatureInput.value = '';
        });
    }

    // Expose for form validation and reset
    window.signaturePad = {
        isEmpty: function () { return !hasSignature; },
        clear: function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasSignature = false;
            wrapper.classList.remove('signed');
            if (signatureInput) signatureInput.value = '';
        },
        getData: function () { return hasSignature ? canvas.toDataURL('image/png') : ''; }
    };
})();
