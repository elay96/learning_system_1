// Global variables
let questions = [];
let currentQuestionIndex = 0;
let selectedOptionIndex = null;
let userAnswers = [];
let selectedQuestionCount = 10; // Default number of questions
let isDarkMode = false;
let isEnglish = false;
let availableExams = []; // Array to store available exam data

// DOM elements
const questionTextElement = document.getElementById('question-text');
const optionsContainerElement = document.getElementById('options-container');
const feedbackContainerElement = document.getElementById('feedback-container');
const feedbackTextElement = document.getElementById('feedback-text');
const explanationTextElement = document.getElementById('explanation-text');
const prevButton = document.getElementById('prev-btn');
const nextButton = document.getElementById('next-btn');
const totalQuestionsElement = document.getElementById('total-questions');
const correctAnswersElement = document.getElementById('correct-answers');
const accuracyElement = document.getElementById('accuracy');
const resetStatsButton = document.getElementById('reset-stats');

// Menu elements
const darkModeToggle = document.getElementById('dark-mode-toggle');
const homeButton = document.getElementById('home-button');
const menuCorrectElement = document.getElementById('menu-correct');
const menuTotalElement = document.getElementById('menu-total');

// Screen elements
const startScreenElement = document.getElementById('start-screen');
const quizContainerElement = document.getElementById('quiz-container');
const summaryScreenElement = document.getElementById('summary-screen');

// Start screen elements
const examSelectElement = document.getElementById('exam-select');
const questionCountElement = document.getElementById('question-count');
const startQuizButton = document.getElementById('start-quiz');

// Summary screen elements
const summaryTotalElement = document.getElementById('summary-total');
const summaryCorrectElement = document.getElementById('summary-correct');
const summaryAccuracyElement = document.getElementById('summary-accuracy');
const restartQuizButton = document.getElementById('restart-quiz');

// Progress bar elements
const progressFillElement = document.getElementById('progress-fill');
const currentQuestionElement = document.getElementById('current-question');
const totalProgressElement = document.getElementById('total-progress');

// Initialize the application
async function initializeApp() {
    // Load available exams from json_files directory
    await loadAvailableExams();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user preferences
    loadPreferences();
    
    // Set up periodic check for new JSON files (every 10 seconds)
    setInterval(checkForNewJsonFiles, 10000);
}

// Check for new JSON files
async function checkForNewJsonFiles() {
    // Store the current exam IDs
    const currentExamIds = availableExams.map(exam => exam.id);
    
    // Try to load any new exams
    await loadAvailableExams();
    
    // Check if any new exams were found
    const newExams = availableExams.filter(exam => !currentExamIds.includes(exam.id));
    
    if (newExams.length > 0) {
        console.log(`Found ${newExams.length} new exam(s):`);
        newExams.forEach(exam => console.log(`- ${exam.name}`));
        
        // If the user is on the start screen, update the selected exam count
        if (!startScreenElement.classList.contains('hidden')) {
            const selectedExamId = examSelectElement.value;
            if (selectedExamId) {
                updateQuestionCountForExam(selectedExamId);
            }
        }
    }
}

// Load available exams from json_files directory
async function loadAvailableExams() {
    try {
        // First, try to load the index.json file which contains the list of all JSON files
        const indexResponse = await fetch('json_files/index.json');
        let jsonFiles = [];
        
        if (indexResponse.ok) {
            const indexData = await indexResponse.json();
            jsonFiles = indexData.files || [];
        }
        
        // Additionally, try to discover new files that might not be in the index yet
        // We'll use a pattern-based approach to check for common file names
        const potentialFiles = [];
        
        // Check for files with pattern: N.*.json where N is a number
        for (let i = 1; i <= 30; i++) {
            // Try various naming patterns
            potentialFiles.push(`${i}.json`);
            potentialFiles.push(`${i}.exam_${i}.json`);
            potentialFiles.push(`${i}.test_${i}.json`);
            potentialFiles.push(`exam_${i}.json`);
            potentialFiles.push(`test_${i}.json`);
            potentialFiles.push(`questions_${i}.json`);
        }
        
        // Also try some common names
        potentialFiles.push('questions.json');
        potentialFiles.push('exams.json');
        potentialFiles.push('tests.json');
        potentialFiles.push('data.json');
        
        // Try to fetch each potential file and add it to jsonFiles if it exists
        for (const potentialFile of potentialFiles) {
            if (!jsonFiles.includes(potentialFile)) {
                try {
                    const testResponse = await fetch(`json_files/${potentialFile}`);
                    if (testResponse.ok) {
                        jsonFiles.push(potentialFile);
                    }
                } catch (e) {
                    // Ignore errors for files that don't exist
                }
            }
        }
        
        // Also try to discover any JSON file in the directory by checking the directory listing
        try {
            const directoryResponse = await fetch('json_files/');
            if (directoryResponse.ok) {
                const text = await directoryResponse.text();
                
                // Use regex to find all JSON files in the directory listing
                const regex = /href="([^"]+\.json)"/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const fileName = match[1];
                    if (!jsonFiles.includes(fileName) && fileName !== 'index.json') {
                        jsonFiles.push(fileName);
                    }
                }
            }
        } catch (e) {
            // Ignore errors if directory listing is not available
        }
        
        if (jsonFiles.length === 0) {
            console.warn('No JSON files found in json_files directory');
            fallbackToSampleQuestions();
            return;
        }
        
        // Clear the exam select dropdown
        examSelectElement.innerHTML = '';
        availableExams = [];
        
        // Process each JSON file
        for (const jsonFile of jsonFiles) {
            try {
                const fileResponse = await fetch(`json_files/${jsonFile}`);
                if (!fileResponse.ok) continue; // Skip files that don't exist
                
                const examData = await fileResponse.json();
                
                // Store the exam data
                availableExams.push({
                    id: jsonFile.replace('.json', ''),
                    name: examData.examName || jsonFile.replace('.json', ''),
                    questions: examData.questions || []
                });
                
                // Add option to the exam select dropdown
                const option = document.createElement('option');
                option.value = jsonFile.replace('.json', '');
                option.textContent = examData.examName || jsonFile.replace('.json', '');
                examSelectElement.appendChild(option);
            } catch (fileError) {
                console.error(`Error loading ${jsonFile}:`, fileError);
                // Continue to the next file
            }
        }
        
        // If no JSON files were found, fall back to sample questions
        if (availableExams.length === 0) {
            console.warn('No valid JSON files found in json_files directory');
            fallbackToSampleQuestions();
            return;
        }
        
        // Update the question count based on the first exam
        if (availableExams.length > 0) {
            updateQuestionCountForExam(availableExams[0].id);
        }
    } catch (error) {
        console.error('Error loading exams:', error);
        fallbackToSampleQuestions();
    }
}

// Fallback to using sample questions if JSON loading fails
function fallbackToSampleQuestions() {
    console.log('Falling back to sample questions');
    
    // Clear the exam select dropdown
    examSelectElement.innerHTML = '';
    
    // Add the sample questions option
    const option = document.createElement('option');
    option.value = 'sample-questions';
    option.textContent = 'כלכלת ישראל - 2025 - שאלות לתרגול';
    examSelectElement.appendChild(option);
    
    // Update the question count based on sample questions
    if (typeof sampleQuestions !== 'undefined') {
        updateQuestionCountForSampleQuestions();
    }
}

// Update the question count input based on the selected exam
function updateQuestionCountForExam(examId) {
    const selectedExam = availableExams.find(exam => exam.id === examId);
    
    if (selectedExam && selectedExam.questions) {
        const questionCount = selectedExam.questions.length;
        
        // Update the total available questions display
        const totalAvailableQuestions = document.getElementById('total-available-questions');
        if (totalAvailableQuestions) {
            totalAvailableQuestions.textContent = questionCount;
        }
        
        // Update the question count input
        if (questionCountElement) {
            questionCountElement.max = questionCount;
            
            // If the current value is greater than the new max, update it
            if (parseInt(questionCountElement.value) > questionCount) {
                questionCountElement.value = questionCount;
            }
            
            // Update the selected question count
            selectedQuestionCount = parseInt(questionCountElement.value);
        }
    }
}

// Update the question count input based on sample questions
function updateQuestionCountForSampleQuestions() {
    if (typeof sampleQuestions !== 'undefined') {
        const questionCount = sampleQuestions.length;
        
        // Update the total available questions display
        const totalAvailableQuestions = document.getElementById('total-available-questions');
        if (totalAvailableQuestions) {
            totalAvailableQuestions.textContent = questionCount;
        }
        
        // Update the question count input
        if (questionCountElement) {
            questionCountElement.max = questionCount;
            questionCountElement.value = questionCount;
            selectedQuestionCount = questionCount;
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Add event listener for exam select change
    examSelectElement.addEventListener('change', function() {
        const selectedExamId = this.value;
        
        if (selectedExamId === 'sample-questions') {
            updateQuestionCountForSampleQuestions();
        } else {
            updateQuestionCountForExam(selectedExamId);
        }
    });
    
    // Add event listener for question count input
    questionCountElement.addEventListener('change', function() {
        // Ensure the value is within the min and max range
        const min = parseInt(this.min) || 1;
        const max = parseInt(this.max) || 100;
        let value = parseInt(this.value) || min;
        
        if (value < min) value = min;
        if (value > max) value = max;
        
        // Update the input value and selected question count
        this.value = value;
        selectedQuestionCount = value;
    });
    
    // Quiz navigation
    nextButton.addEventListener('click', nextQuestion);
    prevButton.addEventListener('click', prevQuestion);
    startQuizButton.addEventListener('click', startQuiz);
    restartQuizButton.addEventListener('click', restartQuiz);
    homeButton.addEventListener('click', goHome);
    
    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);
}

// Load questions from JSON file
function loadQuestionsFromFile(event) {
    const file = jsonFileInput.files[0];
    if (!file) {
        alert('Please select a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data) && data.length > 0) {
                questions = data;
                // Shuffle questions
                shuffleQuestions();
                // Reset quiz state
                resetQuiz();
                // Start the quiz
                displayQuestion();
            } else {
                alert('Invalid JSON format. Please provide an array of questions.');
            }
        } catch (error) {
            alert('Error parsing JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Shuffle questions array
function shuffleQuestions() {
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
}

// Reset quiz state
function resetQuiz() {
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    selectedOptionIndex = null;
    feedbackTextElement.textContent = '';
    explanationTextElement.textContent = '';
    feedbackContainerElement.classList.add('hidden');
    prevButton.disabled = true;
    nextButton.disabled = true;
}

// Display current question
function displayQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    // Update progress bar
    updateProgressBar();
    
    // Display question number and text
    const questionNumberElement = document.getElementById('question-number');
    if (currentQuestion.questionNumber) {
        questionNumberElement.textContent = currentQuestion.questionNumber;
    } else {
        questionNumberElement.textContent = currentQuestionIndex + 1;
    }
    
    // Display question text
    const questionNum = currentQuestion.questionNumber ? currentQuestion.questionNumber : (currentQuestionIndex + 1);
    questionTextElement.textContent = `${questionNum}. ${currentQuestion.question}`;
    
    // Clear options container
    optionsContainerElement.innerHTML = '';
    
    // Create option elements
    const hebrewLetters = ['א', 'ב', 'ג', 'ד', 'ה'];
    currentQuestion.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = `${hebrewLetters[index]}. ${option}`;
        optionElement.dataset.index = index;
        
        // Check if this option was previously selected
        if (userAnswers[currentQuestionIndex] === index) {
            optionElement.classList.add('selected');
            selectedOptionIndex = index;
        }
        
        // Check if the question has been answered
        if (userAnswers[currentQuestionIndex] !== null) {
            // If answered, show correct/incorrect status
            if (index === currentQuestion.correctIndex) {
                optionElement.classList.add('correct');
            } else if (index === userAnswers[currentQuestionIndex]) {
                optionElement.classList.add('incorrect');
            }
            optionElement.classList.add('disabled');
        } else {
            // Add click event listener only if question hasn't been answered
            optionElement.addEventListener('click', selectOption);
        }
        
        optionsContainerElement.appendChild(optionElement);
    });
    
    // Show feedback if question was answered
    if (userAnswers[currentQuestionIndex] !== null) {
        feedbackContainerElement.classList.remove('hidden');
        const isCorrect = userAnswers[currentQuestionIndex] === currentQuestion.correctIndex;
        feedbackTextElement.textContent = isCorrect ? 'נכון!' : 'לא נכון!';
        explanationTextElement.textContent = currentQuestion.explanation;
    } else {
        feedbackTextElement.textContent = '';
        explanationTextElement.textContent = '';
        feedbackContainerElement.classList.add('hidden');
    }
    
    // Update button states
    updateButtonStates();
}

// Select an option
function selectOption(event) {
    // Remove selected class from all options
    const options = optionsContainerElement.querySelectorAll('.option');
    options.forEach(option => option.classList.remove('selected'));
    
    // Add selected class to clicked option
    event.target.classList.add('selected');
    
    // Update selected option index
    selectedOptionIndex = parseInt(event.target.dataset.index);
    
    // Automatically submit the answer when an option is selected
    submitAnswer();
}

// Submit answer
function submitAnswer() {
    if (selectedOptionIndex === null) {
        return;
    }
    
    // Save user's answer
    userAnswers[currentQuestionIndex] = selectedOptionIndex;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOptionIndex === currentQuestion.correctIndex;
    
    // Show feedback in container instead of modal
    feedbackContainerElement.classList.remove('hidden');
    feedbackTextElement.textContent = isCorrect ? 'נכון!' : 'לא נכון!';
    explanationTextElement.textContent = currentQuestion.explanation;
    
    // Highlight correct and incorrect options
    const options = optionsContainerElement.querySelectorAll('.option');
    options.forEach((option, index) => {
        if (index === currentQuestion.correctIndex) {
            option.classList.add('correct');
        } else if (index === selectedOptionIndex && !isCorrect) {
            option.classList.add('incorrect');
        }
        
        // Disable option clicks
        option.removeEventListener('click', selectOption);
    });
    
    // Update menu bar statistics
    updateMenuStats();
    
    // Update button states
    nextButton.disabled = currentQuestionIndex >= questions.length - 1;
    prevButton.disabled = false;
    
    // Check if this is the last question and all questions have been answered
    if (currentQuestionIndex === questions.length - 1 && !userAnswers.includes(null)) {
        // Show summary after a short delay
        setTimeout(showSummary, 1500);
    }
}

// Go to next question
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        selectedOptionIndex = userAnswers[currentQuestionIndex];
        displayQuestion();
    }
}

// Go to previous question
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        selectedOptionIndex = userAnswers[currentQuestionIndex];
        displayQuestion();
    }
}

// Update button states
function updateButtonStates() {
    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.disabled = currentQuestionIndex === questions.length - 1 || userAnswers[currentQuestionIndex] === null;
}

// Update progress bar
function updateProgressBar() {
    if (questions.length === 0) return;
    
    // Update question counter
    currentQuestionElement.textContent = currentQuestionIndex + 1;
    totalProgressElement.textContent = questions.length;
    
    // Update progress fill
    const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressFillElement.style.width = `${progressPercentage}%`;
}

// Start quiz
function startQuiz() {
    // Get selected question count
    selectedQuestionCount = parseInt(questionCountElement.value);
    
    // Get selected exam ID
    const selectedExamId = examSelectElement.value;
    
    if (selectedExamId === 'sample-questions') {
        // Use sample questions if available
        if (typeof sampleQuestions !== 'undefined') {
            // Make a copy of the sample questions
            questions = [...sampleQuestions];
            
            // Shuffle questions
            shuffleQuestions();
            
            // Limit to selected number of questions
            if (selectedQuestionCount > 0 && selectedQuestionCount < questions.length) {
                questions = questions.slice(0, selectedQuestionCount);
            }
            
            // Reset quiz state
            resetQuiz();
            
            // Hide start screen and show quiz container
            startScreenElement.classList.add('hidden');
            quizContainerElement.classList.remove('hidden');
            summaryScreenElement.classList.add('hidden');
            
            // Display first question
            displayQuestion();
        } else {
            alert('No questions available!');
        }
    } else {
        // Find the selected exam in the available exams
        const selectedExam = availableExams.find(exam => exam.id === selectedExamId);
        
        if (selectedExam && selectedExam.questions) {
            // Make a copy of the exam questions
            questions = [...selectedExam.questions];
            
            // Shuffle questions
            shuffleQuestions();
            
            // Limit to selected number of questions
            if (selectedQuestionCount > 0 && selectedQuestionCount < questions.length) {
                questions = questions.slice(0, selectedQuestionCount);
            }
            
            // Reset quiz state
            resetQuiz();
            
            // Hide start screen and show quiz container
            startScreenElement.classList.add('hidden');
            quizContainerElement.classList.remove('hidden');
            summaryScreenElement.classList.add('hidden');
            
            // Display first question
            displayQuestion();
        } else {
            alert('No questions available!');
        }
    }
}

// Show summary screen
function showSummary() {
    // Calculate quiz results
    const totalQuestions = questions.length;
    let correctAnswers = 0;
    
    userAnswers.forEach((answer, index) => {
        if (answer === questions[index].correctIndex) {
            correctAnswers++;
        }
    });
    
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Update summary screen
    summaryTotalElement.textContent = totalQuestions;
    summaryCorrectElement.textContent = correctAnswers;
    summaryAccuracyElement.textContent = accuracy;
    
    // Hide quiz container and show summary screen
    startScreenElement.classList.add('hidden');
    quizContainerElement.classList.add('hidden');
    summaryScreenElement.classList.remove('hidden');
}

// Restart quiz
function restartQuiz() {
    // Show start screen
    startScreenElement.classList.remove('hidden');
    quizContainerElement.classList.add('hidden');
    summaryScreenElement.classList.add('hidden');
}

// Go to home screen
function goHome() {
    // Show start screen and hide other screens
    startScreenElement.classList.remove('hidden');
    quizContainerElement.classList.add('hidden');
    summaryScreenElement.classList.add('hidden');
}

// Update menu bar statistics
function updateMenuStats() {
    // Count correct answers
    let correctCount = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === questions[index].correctIndex) {
            correctCount++;
        }
    });
    
    // Update menu stats
    menuCorrectElement.textContent = correctCount;
    menuTotalElement.textContent = questions.length;
}

// Toggle dark mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '🌞' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// Load dark mode and language preferences
function loadPreferences() {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
        isDarkMode = savedDarkMode === 'true';
        document.body.classList.toggle('dark-mode', isDarkMode);
        darkModeToggle.textContent = isDarkMode ? '🌞' : '🌙';
    }
    
    // Load language preference removed as requested
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);