// TTS Configuration JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initChapterPreview();
    initSpeedSlider();
    initVoicePreview();
});

function initChapterPreview() {
    const checkboxes = document.querySelectorAll('input[name="chapters"]');
    const previewDiv = document.getElementById('chapter-preview');
    const noSelectionDiv = document.getElementById('no-selection');
    const chapterContentDiv = document.getElementById('chapter-content');
    const previewTitle = document.getElementById('preview-chapter-title');
    const previewText = document.getElementById('preview-text');

    if (!checkboxes.length) return; // No chapters to preview

    function showChapterPreview(checkbox) {
        const chapterText = checkbox.getAttribute('data-chapter-text');
        const chapterName = checkbox.parentElement.textContent.trim();

        previewTitle.textContent = chapterName;
        previewText.textContent = chapterText;

        noSelectionDiv.style.display = 'none';
        chapterContentDiv.style.display = 'block';

        // Add visual indicator for which chapter is being previewed
        document.querySelectorAll('.chapter-preview-active').forEach(el => {
            el.classList.remove('chapter-preview-active');
        });
        checkbox.parentElement.parentElement.classList.add('chapter-preview-active');
    }

    // Modify the HTML structure to separate checkbox from clickable text
    checkboxes.forEach(function(checkbox) {
        const label = checkbox.parentElement;
        const chapterName = label.textContent.trim();

        // Create separate elements for checkbox and clickable text
        label.innerHTML = '';

        // Add checkbox
        label.appendChild(checkbox);

        // Add clickable text span
        const textSpan = document.createElement('span');
        textSpan.textContent = chapterName;
        textSpan.style.cursor = 'pointer';
        textSpan.style.marginLeft = '5px';
        textSpan.className = 'chapter-text';

        label.appendChild(textSpan);

        // Add click event to text span only (not checkbox)
        textSpan.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showChapterPreview(checkbox);
        });
    });

    // Select/Deselect all functionality
    const selectAllBtn = document.getElementById('select-all-chapters');
    const deselectAllBtn = document.getElementById('deselect-all-chapters');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            checkboxes.forEach(function(checkbox) {
                checkbox.checked = true;
            });
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            checkboxes.forEach(function(checkbox) {
                checkbox.checked = false;
            });
        });
    }

    // Show preview of first chapter on page load
    if (checkboxes.length > 0) {
        showChapterPreview(checkboxes[0]);
    }
}

function initSpeedSlider() {
    const speedSlider = document.getElementById('speed');
    const speedValue = document.getElementById('speed-value');

    if (!speedSlider || !speedValue) return;

    // Update speed display when slider changes
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value;
    });

    // Set initial value on page load
    speedValue.textContent = speedSlider.value;
}

function initVoicePreview() {
    const previewBtn = document.getElementById('preview-voice');
    const voiceSelect = document.getElementById('voice');
    const audioElement = document.getElementById('voice-preview');

    if (!previewBtn || !voiceSelect || !audioElement) return;

    previewBtn.addEventListener('click', function() {
        const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
        const audioUrl = selectedOption.getAttribute('data-audio');

        if (audioUrl) {
            audioElement.src = audioUrl;
            audioElement.play().catch(function(error) {
                console.log('Audio preview not available for this voice');
            });
        }
    });
}