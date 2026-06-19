/* ========================================
   GSAW Donation Form Logic
======================================== */
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('donation-form');
    if (!form) return;

    var donorTypeRadios = document.querySelectorAll('input[name="donorType"]');
    var individualFields = document.getElementById('individual-fields');
    var orgFields = document.getElementById('org-fields');
    var amountRadios = document.querySelectorAll('input[name="amount"]');
    var customAmountInput = document.getElementById('custom-amount');
    var fileInput = document.getElementById('pop-upload');
    var fileLabel = document.getElementById('file-upload-label');
    var filePreview = document.getElementById('file-upload-preview');
    var fileNameSpan = document.getElementById('file-name');
    var removeFileBtn = document.getElementById('remove-file');
    var fileWrapper = document.getElementById('file-upload-wrapper');
    var submitBtn = document.getElementById('donate-submit-btn');
    var successDiv = document.getElementById('donation-success');
    var paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    var popSection = document.getElementById('pop-section');
    var onlineSection = document.getElementById('online-payment-section');

    // Toggle payment method sections
    paymentMethodRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'online') {
                popSection.style.display = 'none';
                onlineSection.style.display = 'block';
                submitBtn.querySelector('.btn-text').innerHTML = '<i class="fas fa-arrow-right"></i> Save Record &amp; Choose Payment';
            } else {
                popSection.style.display = 'block';
                onlineSection.style.display = 'none';
                submitBtn.querySelector('.btn-text').innerHTML = '<i class="fas fa-heart"></i> Submit Donation';
            }
        });
    });

    // Toggle donor type fields
    donorTypeRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'individual') {
                individualFields.style.display = 'block';
                orgFields.style.display = 'none';
            } else {
                individualFields.style.display = 'none';
                orgFields.style.display = 'block';
            }
        });
    });

    // Show custom amount field
    amountRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'custom') {
                customAmountInput.style.display = 'block';
                customAmountInput.focus();
            } else {
                customAmountInput.style.display = 'none';
                customAmountInput.value = '';
            }
        });
    });

    // Make file upload area clickable
    if (fileWrapper) {
        fileWrapper.addEventListener('click', function (e) {
            if (!fileWrapper.classList.contains('has-file')) {
                fileInput.click();
            }
        });
    }

    // File upload handling
    fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            var file = this.files[0];
            var maxSize = 5 * 1024 * 1024; // 5MB

            if (file.size > maxSize) {
                alert('File is too large. Maximum size is 5MB.');
                this.value = '';
                return;
            }

            var validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (validTypes.indexOf(file.type) === -1) {
                alert('Invalid file type. Please upload JPG, PNG, or PDF.');
                this.value = '';
                return;
            }

            fileNameSpan.textContent = file.name;
            fileLabel.style.display = 'none';
            filePreview.style.display = 'flex';
            fileWrapper.classList.add('has-file');
        }
    });

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function () {
            fileInput.value = '';
            fileLabel.style.display = 'flex';
            filePreview.style.display = 'none';
            fileWrapper.classList.remove('has-file');
        });
    }

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateDonation()) return;

        var btnText = submitBtn.querySelector('.btn-text');
        var btnLoading = submitBtn.querySelector('.btn-loading');
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;

        // Collect data
        var donorType = document.querySelector('input[name="donorType"]:checked').value;
        var selectedAmount = document.querySelector('input[name="amount"]:checked');
        var amount = selectedAmount ? selectedAmount.value : '';
        if (amount === 'custom') {
            amount = customAmountInput.value;
        }

        var donationData = {
            donorType: donorType,
            amount: amount,
            purpose: document.getElementById('donor-purpose').value,
            email: document.getElementById('donor-email').value.trim(),
            phone: document.getElementById('donor-phone').value.trim(),
            message: document.getElementById('donor-message').value.trim(),
            paymentMethod: (document.querySelector('input[name="paymentMethod"]:checked') || {}).value || 'eft',
            hasProofOfPayment: fileInput.files.length > 0,
            proofFileName: fileInput.files.length > 0 ? fileInput.files[0].name : '',
            proofFileType: fileInput.files.length > 0 ? fileInput.files[0].type : '',
            submittedAt: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
        };

        if (donorType === 'individual') {
            donationData.firstName = document.getElementById('donor-firstName').value.trim();
            donationData.lastName = document.getElementById('donor-lastName').value.trim();
            donationData.donorName = donationData.firstName + ' ' + donationData.lastName;
        } else {
            donationData.orgName = document.getElementById('donor-orgName').value.trim();
            donationData.contactPerson = document.getElementById('donor-contactPerson').value.trim();
            donationData.donorName = donationData.orgName;
        }

        // Save donation to Supabase
        function saveDonation(data, file) {
            var dbRecord = {
                donor_name: data.donorName || '',
                donor_type: data.donorType || 'individual',
                first_name: data.firstName || '',
                last_name: data.lastName || '',
                org_name: data.orgName || '',
                contact_person: data.contactPerson || '',
                amount: parseFloat(data.amount) || 0,
                purpose: data.purpose || 'General',
                email: data.email || '',
                phone: data.phone || '',
                message: data.message || '',
                has_proof_of_payment: !!file,
                proof_file_name: file ? file.name : '',
                proof_file_type: file ? file.type : '',
                status: 'pending'
            };

            // Upload file first if exists
            var uploadPromise;
            if (file) {
                var timestamp = Date.now();
                var safeName = (data.donorName || 'donor').replace(/[^a-zA-Z0-9]/g, '_');
                var filePath = 'pop/' + safeName + '_' + timestamp + '_' + file.name;

                uploadPromise = gsawDB.uploadFile('documents', filePath, file).then(function (result) {
                    if (!result.error) {
                        dbRecord.proof_file_url = gsawDB.getFileUrl('documents', filePath);
                    }
                }).catch(function () { /* continue without file */ });
            } else {
                uploadPromise = Promise.resolve();
            }

            uploadPromise.then(function () {
                return gsawDB.addDonation(dbRecord);
            }).then(function () {
                form.style.display = 'none';
                successDiv.style.display = 'block';
                successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Wire up payment gateways for online payments
                if (data.paymentMethod === 'online') {
                    var amtCents = Math.round(parseFloat(data.amount) * 100);
                    var ref = 'GSAW_' + Date.now();

                    // Yoco: static payment page link (replace YOCO_USERNAME after signup at yoco.com)
                    // No NPO/PBO required - just a business bank account
                    // SETUP: Replace YOCO_USERNAME with your Yoco username from pay.yoco.com
                    // document.getElementById('yoco-pay-link').href = 'https://pay.yoco.com/YOCO_USERNAME';

                    // SnapScan: dynamic URL with pre-filled amount in cents
                    // SETUP: Replace SNAPSCAN_MERCHANT_ID with your code from snapscan.co.za
                    document.getElementById('ss-pay-link').href = 'https://pos.snapscan.io/qr/SNAPSCAN_MERCHANT_ID?amount=' + amtCents + '&reference=' + ref;

                    // Ozow: replace href with your merchant payment link from ozow.com
                    // SETUP: document.getElementById('oz-pay-link').href = 'https://pay.ozow.com/YOUR_LINK?amount=' + parseFloat(data.amount).toFixed(2);

                    document.getElementById('complete-payment-section').style.display = 'block';
                }

                // Notify admin of new donation
                if (typeof gsawNotify !== 'undefined') {
                    gsawNotify.sendAdminAlert('new_donation', { donor: dbRecord.donor_name || dbRecord.org_name, email: dbRecord.email || '', amount: dbRecord.amount, purpose: dbRecord.purpose });
                }
            }).catch(function (err) {
                console.error('Donation save error:', err);
                showNotification('Submission failed. Please try again.', 'error');
            }).finally(function () {
                btnText.style.display = 'inline-flex';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;
            });
        }

        var file = fileInput.files.length > 0 ? fileInput.files[0] : null;
        saveDonation(donationData, file);
    });

    function validateDonation() {
        var donorType = document.querySelector('input[name="donorType"]:checked').value;

        // Check donor details
        if (donorType === 'individual') {
            if (!document.getElementById('donor-firstName').value.trim() || !document.getElementById('donor-lastName').value.trim()) {
                showNotification('Please enter your first and last name.', 'error');
                return false;
            }
        } else {
            if (!document.getElementById('donor-orgName').value.trim() || !document.getElementById('donor-contactPerson').value.trim()) {
                showNotification('Please enter organisation name and contact person.', 'error');
                return false;
            }
        }

        // Email
        var email = document.getElementById('donor-email').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showNotification('Please enter a valid email address.', 'error');
            return false;
        }

        // Phone
        var phone = document.getElementById('donor-phone').value.replace(/[\s\-()]/g, '');
        if (phone.length < 10) {
            showNotification('Please enter a valid phone number.', 'error');
            return false;
        }

        // Amount
        var selectedAmount = document.querySelector('input[name="amount"]:checked');
        if (!selectedAmount) {
            showNotification('Please select a donation amount.', 'error');
            return false;
        }
        if (selectedAmount.value === 'custom' && (!customAmountInput.value || parseFloat(customAmountInput.value) < 10)) {
            showNotification('Please enter a valid custom amount (minimum R10).', 'error');
            return false;
        }

        // Proof of payment (only required for EFT)
        var paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
        var isEFT = !paymentMethod || paymentMethod.value === 'eft';
        if (isEFT && (!fileInput.files || fileInput.files.length === 0)) {
            showNotification('Please upload your proof of payment.', 'error');
            return false;
        }

        // POPIA
        if (!document.getElementById('donor-popia').checked) {
            showNotification('Please accept the POPIA consent.', 'error');
            return false;
        }

        return true;
    }
});

// Reset donation form
function resetDonationForm() {
    var form = document.getElementById('donation-form');
    var success = document.getElementById('donation-success');
    if (form && success) {
        form.reset();
        form.style.display = 'block';
        success.style.display = 'none';
        document.getElementById('individual-fields').style.display = 'block';
        document.getElementById('org-fields').style.display = 'none';
        document.getElementById('custom-amount').style.display = 'none';
        document.getElementById('file-upload-label').style.display = 'flex';
        document.getElementById('file-upload-preview').style.display = 'none';
        document.getElementById('file-upload-wrapper').classList.remove('has-file');
    }
}
