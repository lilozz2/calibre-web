document.getElementById('llm-query-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const prompt = document.getElementById('llm-prompt').value;
    const bookId = document.querySelector('[data-book-id]').getAttribute('data-book-id');
    const responseDiv = document.getElementById('llm-response');
    const responseText = document.getElementById('llm-response-text');
    
    // Show loading spinner
    responseText.innerHTML = '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
    responseDiv.style.display = 'block';
    
    fetch('/web/query-llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
        },
        body: JSON.stringify({
            book_id: bookId,
            prompt: prompt
        })
    })
    .then(response => response.json())
    .then(data => {
        responseText.textContent = data.response;
    })
    .catch(error => {
        responseText.textContent = 'Error: ' + error;
    });
});