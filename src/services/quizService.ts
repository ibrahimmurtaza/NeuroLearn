import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from './errorHandlingService';
import {
  QuizDocument,
  QuizChunk,
  QuizQuestion,
  Quiz,
  QuizAttempt,
  QuizUserStats,
  QuestionFlag,
  QuizGenerationRequest,
  QuizGenerationResponse,
  QuizSubmissionRequest,
  QuizSubmissionResponse,
  QuizFlagRequest,
  QuizFlagResponse,
  VerificationResult,
  QuizProcessingStatus,
  GenerationSettings,
  QuestionEvidence,
  QuestionType,
  DifficultyLevel
} from '@/types/quiz';

export class QuizService {
  private openai: OpenAI;
  private supabase: any;
  private errorHandler: ErrorHandlingService;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  /**
   * Generate quiz from documents
   */
  async generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
    try {
      const startTime = Date.now();
      
      // Validate request
      if (!request.doc_ids || request.doc_ids.length === 0) {
        throw new Error('At least one document ID is required');
      }

      // Create quiz record
      const quiz = await this.createQuizRecord(request);
      
      // Retrieve relevant chunks
      const chunks = await this.retrieveRelevantChunks(request.doc_ids, request.preferences.num_questions);
      
      if (chunks.length === 0) {
        throw new Error('No relevant content found in the provided documents');
      }

      // Generate questions
      const questions: QuizQuestion[] = [];
      const failedVerifications: string[] = [];
      
      for (let i = 0; i < request.preferences.num_questions; i++) {
        const relevantChunks = this.selectChunksForQuestion(chunks, i, request.preferences.num_questions);
        
        if (relevantChunks.length === 0) {
          continue;
        }

        const question = await this.generateSingleQuestion(
          relevantChunks,
          request.preferences.question_types,
          request.preferences.difficulty_range,
          quiz.id,
          request.custom_prompt,
          request.preferences.focus_topics
        );

        if (question) {
          // Verify question
          const verification = await this.verifyQuestion(question);
          
          if (verification.is_valid) {
            question.verified = true;
            questions.push(question);
          } else {
            question.verified = false;
            question.verification_reason = verification.issues.join('; ');
            failedVerifications.push(question.id);
            
            // Still add to questions but mark as unverified
            questions.push(question);
          }
        }
      }

      // Save questions to database
      console.log(`[DEBUG] About to save ${questions.length} questions to database`);
      console.log(`[DEBUG] Questions data:`, JSON.stringify(questions, null, 2));
      console.log(`[DEBUG] Calling saveQuestionsToDatabase method...`);
      console.log(`[DEBUG] Method exists:`, typeof this.saveQuestionsToDatabase);
      try {
        console.log(`[DEBUG] Entering saveQuestionsToDatabase...`);
        await this.saveQuestionsToDatabase(questions);
        console.log(`[DEBUG] Finished saving questions to database`);
      } catch (saveError) {
        console.error(`[ERROR] Failed to save questions to database:`, saveError);
        console.error(`[ERROR] Error message:`, saveError?.message);
        console.error(`[ERROR] Error stack:`, saveError?.stack);
        // Continue with the process even if saving fails
      }

      // Update quiz with questions metadata
      console.log(`[DEBUG] About to update quiz metadata`);
      await this.updateQuizWithQuestions(quiz.id, questions);
      console.log(`[DEBUG] Finished updating quiz metadata`);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        quiz_id: quiz.id,
        questions,
        metadata: {
          total_generated: questions.length,
          verified_count: questions.filter(q => q.verified).length,
          failed_verification: failedVerifications.length,
          processing_time: processingTime
        }
      };

    } catch (error) {
      this.errorHandler.createError(
        ErrorType.PROCESSING_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        {
          severity: ErrorSeverity.HIGH,
          context: { request },
          originalError: error instanceof Error ? error : undefined
        }
      );

      return {
        success: false,
        quiz_id: '',
        questions: [],
        metadata: {
          total_generated: 0,
          verified_count: 0,
          failed_verification: 0,
          processing_time: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create quiz record in database
   */
  private async createQuizRecord(request: QuizGenerationRequest): Promise<Quiz> {
    const { data, error } = await this.supabase
      .from('quiz_quizzes')
      .insert({
        user_id: request.user_id,
        creator_id: request.user_id,
        title: `Quiz - ${new Date().toLocaleDateString()}`,
        document_ids: request.doc_ids,
        mode: request.preferences.mode,
        time_limit: request.preferences.time_limit,
        status: 'draft',
        settings: {
          shuffle_questions: true,
          shuffle_options: true,
          show_feedback: true,
          allow_review: true
        },
        metadata: {
          total_questions: request.preferences.num_questions,
          difficulty_distribution: {},
          estimated_duration: request.preferences.time_limit || 30,
          generation_settings: {
            model: 'gpt-3.5-turbo',
            temperature: 0.0,
            max_tokens: 1000,
            chunk_overlap: 200,
            min_evidence_length: 50,
            max_evidence_length: 300,
            verification_enabled: true
          }
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create quiz record: ${error.message}`);
    }

    return data;
  }

  /**
   * Retrieve relevant chunks from documents
   */
  private async retrieveRelevantChunks(docIds: string[], numQuestions: number): Promise<QuizChunk[]> {
    console.log('=== Retrieving Chunks Debug ===');
    console.log('Document IDs:', docIds);
    console.log('Number of questions:', numQuestions);
    console.log('Limit:', numQuestions * 3);
    
    // Get chunks from the specified documents
    const { data: chunks, error } = await this.supabase
      .from('quiz_chunks')
      .select('*')
      .in('doc_id', docIds)
      .limit(numQuestions * 3); // Get more chunks than needed for variety

    console.log('Chunks retrieved:', chunks?.length || 0);
    console.log('Error:', error);
    if (chunks && chunks.length > 0) {
      console.log('First chunk preview:', chunks[0].text.substring(0, 100) + '...');
    }

    if (error) {
      throw new Error(`Failed to retrieve chunks: ${error.message}`);
    }

    return chunks || [];
  }

  /**
   * Select chunks for a specific question
   */
  private selectChunksForQuestion(chunks: QuizChunk[], questionIndex: number, totalQuestions: number): QuizChunk[] {
    const chunkSize = Math.ceil(chunks.length / totalQuestions);
    const startIndex = questionIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, chunks.length);
    
    return chunks.slice(startIndex, endIndex);
  }

  /**
   * Generate a single question using LLM
   */
  private async generateSingleQuestion(
    chunks: QuizChunk[],
    questionTypes: QuestionType[],
    difficultyRange: { min: DifficultyLevel; max: DifficultyLevel },
    quizId: string,
    customPrompt?: string,
    focusTopics?: string[]
  ): Promise<QuizQuestion | null> {
    try {
      const context = chunks.map(chunk => chunk.text).join('\n\n');
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      const difficulty = Math.floor(Math.random() * (difficultyRange.max - difficultyRange.min + 1)) + difficultyRange.min as DifficultyLevel;

      console.log('=== Question Generation Debug ===');
      console.log('Chunks count:', chunks.length);
      console.log('Context length:', context.length);
      console.log('Context preview:', context.substring(0, 200) + '...');
      console.log('Question type:', questionType);
      console.log('Difficulty:', difficulty);
      console.log('Focus topics:', focusTopics);

      const prompt = this.buildQuestionGenerationPrompt(context, questionType, difficulty, customPrompt, focusTopics);
      console.log('Prompt length:', prompt.length);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate high-quality quiz questions that test conceptual understanding and application of knowledge. Focus on core concepts, principles, and their practical applications rather than specific details like chapter numbers, page references, or structural information. Create questions that assess comprehension, analysis, and critical thinking. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.0 // Deterministic generation
      });

      console.log('OpenAI response:', JSON.stringify(response, null, 2));
      const content = response.choices[0]?.message?.content;
      console.log('Content received:', content);
      
      if (!content) {
        console.error('No content generated from LLM - response was:', response);
        throw new Error('No content generated from LLM');
      }

      // Parse JSON response
      let questionData;
      try {
        questionData = JSON.parse(content);
      } catch (parseError) {
        // Retry once if JSON parsing fails
        console.warn('JSON parsing failed, retrying...');
        return await this.generateSingleQuestion(chunks, questionTypes, difficultyRange, quizId, customPrompt);
      }

      // Check for insufficient source response
      if (questionData.status === 'INSUFFICIENT_SOURCE') {
        return null;
      }

      // Create evidence from chunks
      const evidence: QuestionEvidence[] = chunks.map(chunk => ({
        chunk_id: chunk.id,
        start: 0,
        end: Math.min(chunk.text.length, 200),
        text_snippet: chunk.text.substring(0, 200),
        relevance_score: 0.8
      }));

      const question: QuizQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quiz_id: quizId,
        type: questionType,
        prompt: questionData.prompt,
        options: questionData.options || [],
        correct_option_index: questionData.correct_option_index,
        answer_text: questionData.answer_text,
        evidence,
        difficulty,
        source_doc_ids: chunks.map(chunk => chunk.doc_id),
        generated_by: 'gpt-3.5-turbo',
        verified: false,
        created_at: new Date().toISOString(), // Keep for interface compatibility
        metadata: {
          generation_time: Date.now(),
          confidence_score: 0.8
        }
      };
      
      console.log(`[DEBUG] Generated question structure:`, {
        id: question.id,
        quiz_id: question.quiz_id,
        type: question.type,
        evidence_count: question.evidence.length,
        has_created_at: !!question.created_at
      });

      return question;

    } catch (error) {
      console.error('Error generating question:', error);
      return null;
    }
  }

  /**
   * Build prompt for question generation
   */
  private buildQuestionGenerationPrompt(
    context: string,
    questionType: QuestionType,
    difficulty: DifficultyLevel,
    customPrompt?: string,
    focusTopics?: string[]
  ): string {
    const focusTopicsText = focusTopics && focusTopics.length > 0 
      ? `\nFOCUS AREAS: Generate questions specifically about these topics: ${focusTopics.join(', ')}`
      : '';

    const basePrompt = `
Generate a ${questionType} question based on the provided CONTEXT that tests ONLY conceptual understanding and application of knowledge.

CONTEXT:
${context}${focusTopicsText}

REQUIREMENTS:
- Question type: ${questionType}
- Difficulty level: ${difficulty}/5
- MUST focus EXCLUSIVELY on core concepts, principles, and their practical applications
- Test comprehension, analysis, and critical thinking rather than memorization
- Base the question ONLY on conceptual information from the provided context
${focusTopics && focusTopics.length > 0 ? `- IMPORTANT: Focus specifically on these topics: ${focusTopics.join(', ')}. Generate questions that test conceptual knowledge about these specific areas.` : ''}
- For MCQ: provide 4 options with one correct answer (do not include letter labels like A, B, C, D - only the option text)
- Make the question clear and educational
- Ensure the correct answer demonstrates understanding of concepts from the context

CRITICAL UNIQUENESS REQUIREMENTS:
- NEVER generate similar or repetitive questions
- Each question MUST explore a DIFFERENT aspect or angle of the concept
- UNIQUE CONCEPT REQUIREMENT: Every question must target a distinct concept that is different from other questions in the same quiz; if the same topic is addressed again, change the conceptual facet (e.g., assumptions, mechanism, evaluation metrics, limitations, error sources, comparisons, trade-offs, interpretability, failure modes, real-world application scenarios)
- Vary question formats: purpose/objective, process/mechanism, comparison, application, cause-effect, advantages/disadvantages
- If the topic is "Linear Regression", create diverse questions like:
  * How it works (mechanism)
  * When to use it (application scenarios)
  * Advantages vs disadvantages
  * Relationship to other concepts
  * Assumptions and their implications
  * Common pitfalls and error analysis
  * Real-world implications
- AVOID repeating the same question structure or phrasing
- AVOID asking about the same specific detail multiple times
- Each question should test a UNIQUE conceptual understanding

CAREFTUL KNOWLEDGE TESTING STANDARDS:
- Craft each question carefully to diagnose the student's understanding rather than surface-level recall
- For MCQs, include plausible distractors based on common misconceptions; avoid trivial wording differences
- Ensure the correct answer requires conceptual reasoning grounded in the provided context
- Favor analysis, comparison, application, and cause–effect explanations over definition-only prompts

IMPORTANT FOR MCQ OPTIONS:
- Do NOT include letter labels (A, B, C, D) in the option text
- Provide only the actual option content
- The frontend will automatically add letter labels

STRICTLY AVOID - DO NOT GENERATE QUESTIONS ABOUT:
- Which chapter/section covers a topic (e.g., "Which machine learning algorithm is covered in the fourth chapter...")
- Page numbers or document structure
- Organizational hierarchy or layout
- Simple recall of isolated facts without conceptual connection
- Structural information about the document or book organization
- References to specific chapters, sections, or parts of the document
- Questions that ask about the location of information rather than the information itself

CONCEPTUAL FOCUS ONLY:
- Generate questions about HOW concepts work, not WHERE they are mentioned
- Focus on WHY principles are important, not WHICH section discusses them
- Test understanding of relationships between concepts
- Ask about applications and implications of the knowledge

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}

Respond with valid JSON in this format:
{
  "prompt": "Your question here",
  "options": ["Option text without labels", "Another option text", "Third option text", "Fourth option text"], // Only for MCQ - DO NOT include A, B, C, D labels
  "correct_option_index": 0, // Only for MCQ (0-based index)
  "answer_text": "Canonical answer",
  "explanation": "Why this is the correct answer based on the context"
}

IMPORTANT: Always generate a question. Do not return {"status": "INSUFFICIENT_SOURCE"}.`;

    return basePrompt.trim();
  }

  /**
   * Verify generated question
   */
  private async verifyQuestion(question: QuizQuestion): Promise<VerificationResult> {
    const issues: string[] = [];
    let confidenceScore = 1.0;

    // Check if evidence supports the answer
    const hasEvidence = question.evidence.length > 0;
    if (!hasEvidence) {
      issues.push('No supporting evidence provided');
      confidenceScore -= 0.3;
    }

    // Check evidence quality
    const evidenceQuality = this.assessEvidenceQuality(question);
    if (evidenceQuality === 'low') {
      issues.push('Evidence quality is low');
      confidenceScore -= 0.2;
    }

    // For MCQ questions, validate options
    if (question.type === 'mcq') {
      const optionValidation = this.validateMCQOptions(question);
      if (!optionValidation.correct_option_valid) {
        issues.push('Invalid correct option index');
        confidenceScore -= 0.3;
      }
      if (!optionValidation.distractors_valid) {
        issues.push('Invalid distractors');
        confidenceScore -= 0.2;
      }
      if (!optionValidation.option_count_valid) {
        issues.push('Invalid number of options (must be 3-6)');
        confidenceScore -= 0.2;
      }
    }

    // Check answer text quality
    if (!question.answer_text || question.answer_text.length < 3) {
      issues.push('Answer text is too short or missing');
      confidenceScore -= 0.2;
    }

    return {
      is_valid: issues.length === 0,
      issues,
      confidence_score: Math.max(0, confidenceScore),
      evidence_validation: {
        has_supporting_evidence: hasEvidence,
        evidence_quality: evidenceQuality
      },
      option_validation: question.type === 'mcq' ? this.validateMCQOptions(question) : undefined
    };
  }

  /**
   * Assess evidence quality
   */
  private assessEvidenceQuality(question: QuizQuestion): 'high' | 'medium' | 'low' {
    if (question.evidence.length === 0) return 'low';
    
    const avgSnippetLength = question.evidence.reduce((sum, ev) => sum + ev.text_snippet.length, 0) / question.evidence.length;
    
    if (avgSnippetLength > 100) return 'high';
    if (avgSnippetLength > 50) return 'medium';
    return 'low';
  }

  /**
   * Validate MCQ options
   */
  private validateMCQOptions(question: QuizQuestion): {
    correct_option_valid: boolean;
    distractors_valid: boolean;
    option_count_valid: boolean;
  } {
    const options = question.options || [];
    const correctIndex = question.correct_option_index;

    return {
      correct_option_valid: correctIndex !== undefined && correctIndex >= 0 && correctIndex < options.length,
      distractors_valid: options.length > 1 && new Set(options).size === options.length, // No duplicates
      option_count_valid: options.length >= 3 && options.length <= 6
    };
  }

  /**
   * Save questions to database
   */
  private async saveQuestionsToDatabase(questions: QuizQuestion[]): Promise<void> {
    console.log(`[DEBUG] Attempting to save ${questions.length} questions to database`);
    
    for (const question of questions) {
      console.log(`[DEBUG] Saving question: ${question.id}`);
      console.log(`[DEBUG] Question data:`, {
        id: question.id,
        quiz_id: question.quiz_id,
        type: question.type,
        prompt: question.prompt?.substring(0, 50) + '...',
        verified: question.verified
      });
      
      // Save question (let database generate UUID)
      const { data: insertedQuestion, error: questionError } = await this.supabase
        .from('quiz_questions')
        .insert({
          quiz_id: question.quiz_id,
          type: question.type,
          prompt: question.prompt,
          options: question.options,
          correct_option_index: question.correct_option_index,
          answer_text: question.answer_text,
          difficulty: question.difficulty,
          source_doc_ids: question.source_doc_ids,
          generated_by: question.generated_by,
          verified: question.verified,
          verification_reason: question.verification_reason
        })
        .select()
        .single();

      if (questionError) {
        console.error('[ERROR] Error saving question:', questionError);
        continue;
      } else {
        console.log(`[DEBUG] Successfully saved question: ${insertedQuestion?.id}`);
      }

      // Save evidence using the actual question ID from database
      if (insertedQuestion) {
        for (const evidence of question.evidence) {
          const { error: evidenceError } = await this.supabase
            .from('quiz_question_evidence')
            .insert({
              question_id: insertedQuestion.id,
              chunk_id: evidence.chunk_id,
              start_pos: evidence.start,
              end_pos: evidence.end,
              text_snippet: evidence.text_snippet
            });

          if (evidenceError) {
            console.error('Error saving evidence:', evidenceError);
          } else {
            console.log(`[DEBUG] Successfully saved evidence for question: ${insertedQuestion.id}`);
          }
        }
      }
    }
  }

  /**
   * Update quiz with generated questions
   */
  private async updateQuizWithQuestions(quizId: string, questions: QuizQuestion[]): Promise<void> {
    const difficultyDistribution = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<DifficultyLevel, number>);

    const { error } = await this.supabase
      .from('quiz_quizzes')
      .update({
        status: 'published',
        metadata: {
          total_questions: questions.length,
          difficulty_distribution: difficultyDistribution,
          estimated_duration: Math.ceil(questions.length * 2), // 2 minutes per question
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', quizId);

    if (error) {
      throw new Error(`Failed to update quiz: ${error.message}`);
    }
  }

  /**
   * Submit quiz attempt
   */
  async submitQuiz(request: QuizSubmissionRequest): Promise<QuizSubmissionResponse> {
    try {
      console.log('=== SUBMIT QUIZ SERVICE START ===');
      console.log('submitQuiz called with request:', JSON.stringify(request, null, 2));
      
      // Get quiz and questions
      console.log('About to query database for quiz:', request.quiz_id);
      const { data: quiz, error: quizError } = await this.supabase
        .from('quiz_quizzes')
        .select(`
          *,
          quiz_questions (
            id,
            type,
            prompt,
            options,
            correct_option_index,
            answer_text,
            difficulty,
            quiz_question_evidence (
              chunk_id,
              start_pos,
              end_pos,
              text_snippet
            )
          )
        `)
        .eq('id', request.quiz_id)
        .single();

      console.log('Database query result:', { 
        quiz: !!quiz, 
        error: quizError,
        quizData: quiz ? {
          id: quiz.id,
          title: quiz.title,
          questionsLength: quiz.quiz_questions?.length
        } : null
      });
      
      if (quizError) {
        console.error('Quiz query error:', quizError);
        throw new Error(`Quiz query failed: ${quizError.message}`);
      }
      
      if (!quiz) {
        console.error('Quiz is null/undefined');
        throw new Error('Quiz not found');
      }

      console.log('Quiz found:', {
        id: quiz.id,
        title: quiz.title,
        questionsCount: quiz.quiz_questions?.length || 0
      });

      // Calculate score and feedback
      const feedback = await this.calculateScoreAndFeedback(quiz.quiz_questions, request.answers);
      console.log('Feedback calculated:', feedback?.length || 0, 'items');
      
      if (!feedback || !Array.isArray(feedback)) {
        console.error('Feedback is not an array:', feedback);
        throw new Error('Failed to calculate feedback');
      }
      
      const score = Math.round((feedback.filter(f => f.is_correct).length / feedback.length) * 100);

      // Save attempt
      const attempt = {
        user_id: request.user_id,
        quiz_id: request.quiz_id,
        score,
        started_at: new Date(Date.now() - request.time_taken).toISOString(),
        completed_at: new Date().toISOString()
      };

      console.log('Attempting to save quiz attempt:', attempt);

      const { data: savedAttempt, error: attemptError } = await this.supabase
        .from('quiz_attempts')
        .insert(attempt)
        .select()
        .single();

      if (attemptError) {
        console.error('Attempt save error:', attemptError);
        throw new Error(`Failed to save attempt: ${attemptError.message}`);
      }

      console.log('Saved attempt with ID:', savedAttempt.id);

      // Save individual answers
      const answerRecords = request.answers.map((answer, index) => ({
        attempt_id: savedAttempt.id,
        question_id: answer.question_id,
        selected_answer: { selected: answer.selected },
        is_correct: feedback[index]?.is_correct || false,
        time_taken_ms: answer.time_taken_ms
      }));

      console.log('Attempting to save answer records:', answerRecords.length, 'records');

      const { error: answersError } = await this.supabase
        .from('quiz_attempt_answers')
        .insert(answerRecords);

      if (answersError) {
        console.error('Answers save error:', answersError);
        throw new Error(`Failed to save answers: ${answersError.message}`);
      }

      // Update user stats
      await this.updateUserStats(request.user_id, { ...savedAttempt, answers: feedback });

      return {
        success: true,
        attempt_id: savedAttempt.id,
        score,
        percentage: score,
        feedback
      };

    } catch (error) {
      return {
        success: false,
        attempt_id: '',
        score: 0,
        percentage: 0,
        feedback: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Calculate score and generate feedback
   */
  private async calculateScoreAndFeedback(questions: any[], answers: any[]): Promise<any[]> {
    return questions.map((question) => {
      // Find the user's answer for this specific question by question_id
      const userAnswer = answers.find(answer => answer.question_id === question.id);
      let isCorrect = false;

      if (userAnswer) {
        if (question.type === 'mcq') {
          isCorrect = userAnswer.selected === question.correct_option_index;
        } else {
          // For text-based questions, do a simple comparison
          const userText = (userAnswer.answer_text || '').toLowerCase().trim();
          const correctText = (question.answer_text || '').toLowerCase().trim();
          isCorrect = userText === correctText || userText.includes(correctText);
        }
      }

      return {
        question_id: question.id,
        is_correct: isCorrect,
        correct_answer: question.answer_text,
        explanation: `The correct answer is: ${question.answer_text}`,
        evidence: question.quiz_question_evidence || [],
        time_taken: userAnswer?.time_taken_ms || 0
      };
    });
  }

  /**
   * Update user statistics
   */
  private async updateUserStats(userId: string, attempt: QuizAttempt): Promise<void> {
    const { data: existingStats } = await this.supabase
      .from('quiz_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const answersArr = (attempt as any)?.answers || [];
    const correctAnswers = Array.isArray(answersArr) ? answersArr.filter((a: any) => a?.is_correct).length : 0;
    const totalAnswers = Array.isArray(answersArr) ? answersArr.length : 0;

    if (existingStats) {
      // Update existing stats
      const newTotalAttempts = existingStats.total_attempts + 1;
      const newCorrectAnswers = existingStats.correct_answers + correctAnswers;
      const newAverageScore = ((existingStats.average_score * existingStats.total_attempts) + attempt.score) / newTotalAttempts;

      await this.supabase
        .from('quiz_user_stats')
        .update({
          total_attempts: newTotalAttempts,
          correct_answers: newCorrectAnswers,
          average_score: newAverageScore,
          last_updated: new Date().toISOString(),
          performance_trend: this.calculatePerformanceTrend(existingStats.average_score, attempt.score)
        })
        .eq('user_id', userId);
    } else {
      // Create new stats
      await this.supabase
        .from('quiz_user_stats')
        .insert({
          user_id: userId,
          skill_theta: 0.0,
          total_attempts: 1,
          correct_answers: correctAnswers,
          average_score: attempt.score,
          last_updated: new Date().toISOString(),
          performance_trend: 'stable'
        });
    }
  }

  /**
   * Calculate performance trend
   */
  private calculatePerformanceTrend(previousScore: number, currentScore: number): 'improving' | 'stable' | 'declining' {
    const difference = currentScore - previousScore;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Flag a question
   */
  async flagQuestion(request: QuizFlagRequest): Promise<QuizFlagResponse> {
    try {
      const flag: QuestionFlag = {
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        question_id: request.question_id,
        user_id: request.user_id,
        category: request.category,
        reason: request.reason,
        description: request.description,
        status: 'pending',
        priority: 'medium',
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('quiz_question_flags')
        .insert(flag);

      if (error) {
        throw new Error(`Failed to flag question: ${error.message}`);
      }

      // Update flag count on question
      await this.supabase.rpc('increment_question_flag_count', {
        question_id: request.question_id
      });

      return {
        success: true,
        flag_id: flag.id,
        message: 'Question flagged successfully'
      };

    } catch (error) {
      return {
        success: false,
        flag_id: '',
        message: 'Failed to flag question',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get quiz by ID (without answers for taking)
   */
  async getQuizForTaking(quizId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('quiz_quizzes')
      .select(`
        id,
        title,
        description,
        mode,
        time_limit,
        settings,
        metadata,
        quiz_questions (
          id,
          type,
          prompt,
          options,
          difficulty
        )
      `)
      .eq('id', quizId)
      .single();

    if (error) {
      throw new Error(`Failed to get quiz: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<QuizUserStats | null> {
    const { data, error } = await this.supabase
      .from('quiz_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw new Error(`Failed to get user stats: ${error.message}`);
    }

    return data;
  }

  /**
   * Get attempt history
   */
  async getAttemptHistory(userId: string, quizId?: string): Promise<QuizAttempt[]> {
    let query = this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get attempt history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate quiz from topic (with document context when available)
   */
  async generateQuizFromTopic(request: {
    user_id: string;
    topic: string;
    additional_topics?: string[];
    preferences: any;
    custom_prompt?: string;
  }): Promise<{ quiz: Quiz }> {
    try {
      const startTime = Date.now();
      
      // Search for relevant documents based on the topic
      const relevantDocuments = await this.searchDocumentsByTopic(request.user_id, request.topic);
      const docIds = relevantDocuments.map(doc => doc.id);
      
      // Create quiz record with relevant document IDs
      const quizRequest = {
        user_id: request.user_id,
        doc_ids: docIds,
        preferences: request.preferences
      };
      
      const quiz = await this.createQuizRecord(quizRequest);
      
      // Generate questions based on topic and document context
      const questions: QuizQuestion[] = [];
      const allTopics = [request.topic, ...(request.additional_topics || [])];
      
      // If we have relevant documents, use document-based generation for better questions
      if (relevantDocuments.length > 0) {
        console.log(`Found ${relevantDocuments.length} relevant documents for topic: ${request.topic}`);
        
        // Retrieve document chunks for context
        const documentChunks = await this.retrieveRelevantChunks(docIds, request.preferences.num_questions);
        
        for (let i = 0; i < request.preferences.num_questions; i++) {
          // Convert difficulty range to a single difficulty level
          const difficultyLevel = Math.floor(Math.random() * (request.preferences.difficulty_range.max - request.preferences.difficulty_range.min + 1)) + request.preferences.difficulty_range.min;
          
          const question = await this.generateDocumentBasedTopicQuestion(
            request.topic,
            allTopics,
            documentChunks,
            request.preferences.question_types,
            difficultyLevel,
            quiz.id,
            request.custom_prompt
          );

          if (question) {
            // Verify question
            const verification = await this.verifyQuestion(question);
            
            if (verification.is_valid) {
              question.verified = true;
              questions.push(question);
            } else {
              question.verified = false;
              question.verification_reason = verification.issues.join('; ');
              questions.push(question);
            }
          }
        }
      } else {
        console.log(`No relevant documents found for topic: ${request.topic}, using general topic-based generation`);
        
        // Fallback to original topic-based generation if no documents found
        for (let i = 0; i < request.preferences.num_questions; i++) {
          // Generate random difficulty within range for fallback
          const difficultyLevel = Math.floor(Math.random() * (request.preferences.difficulty_range.max - request.preferences.difficulty_range.min + 1)) + request.preferences.difficulty_range.min;
          
          const question = await this.generateTopicBasedQuestion(
            request.topic,
            allTopics,
            request.preferences.question_types,
            difficultyLevel,
            quiz.id,
            request.custom_prompt
          );

          if (question) {
            // Verify question
            const verification = await this.verifyQuestion(question);
            
            if (verification.is_valid) {
              question.verified = true;
              questions.push(question);
            } else {
              question.verified = false;
              question.verification_reason = verification.issues.join('; ');
              questions.push(question);
            }
          }
        }
      }

      // Save questions to database
      try {
        await this.saveQuestionsToDatabase(questions);
      } catch (saveError) {
        console.error('Failed to save questions to database:', saveError);
      }

      // Update quiz with questions metadata
      await this.updateQuizWithQuestions(quiz.id, questions);

      const processingTime = Date.now() - startTime;

      // Return the complete quiz object
      const completeQuiz: Quiz = {
        id: quiz.id,
        user_id: request.user_id,
        title: `Quiz: ${request.topic}`,
        description: `AI-generated quiz on ${request.topic}${request.additional_topics?.length ? ` and related topics` : ''}`,
        questions,
        settings: request.preferences,
        created_at: quiz.created_at,
        updated_at: new Date().toISOString(),
        status: 'active',
        metadata: {
          total_generated: questions.length,
          verified_count: questions.filter(q => q.verified).length,
          processing_time: processingTime,
          generation_method: 'topic-based'
        }
      };

      return { quiz: completeQuiz };

    } catch (error) {
      console.error('Error generating quiz from topic:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate quiz from topic');
    }
  }

  /**
   * Generate a single question based on topic
   */
  private async generateTopicBasedQuestion(
    mainTopic: string,
    allTopics: string[],
    questionTypes: any[],
    difficulty: number,
    quizId: string,
    customPrompt?: string
  ): Promise<QuizQuestion | null> {
    try {
      // Select random question type
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      // Build topic-based prompt
      const prompt = this.buildTopicBasedPrompt(
        mainTopic,
        allTopics,
        questionType,
        difficulty,
        customPrompt
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert quiz generator. Create high-quality, educational questions based on the given topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from LLM');
      }

      // Parse JSON response
      let questionData;
      try {
        questionData = JSON.parse(content);
      } catch (parseError) {
        console.warn('JSON parsing failed for topic-based question');
        return null;
      }

      // Ensure question type is not undefined
      const finalQuestionType = questionData.type || questionType;

      // Create question object
      const question: QuizQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quiz_id: quizId,
        type: finalQuestionType,
        prompt: questionData.prompt,
        options: questionData.options || [],
        correct_option_index: questionData.correct_option_index,
        answer_text: questionData.answer_text,
        evidence: [], // No document evidence for topic-based questions
        difficulty,
        source_doc_ids: [], // No source documents
        generated_by: 'gpt-3.5-turbo',
        verified: false,
        created_at: new Date().toISOString(),
        metadata: {
          generation_time: Date.now(),
          confidence_score: 0.8,
          topic: mainTopic,
          all_topics: allTopics,
          explanation: questionData.explanation
        }
      };

      return question;

    } catch (error) {
      console.error('Error generating topic-based question:', error);
      return null;
    }
  }

  /**
   * Build prompt for topic-based question generation
   */
  private buildTopicBasedPrompt(
    mainTopic: string,
    allTopics: string[],
    questionType: string,
    difficulty: number,
    customPrompt?: string
  ): string {
    const topicsText = allTopics.length > 1 
      ? `Main topic: ${mainTopic}\nRelated topics: ${allTopics.slice(1).join(', ')}`
      : `Topic: ${mainTopic}`;

    const basePrompt = `
Generate a ${questionType} question about the following topic(s):

${topicsText}

REQUIREMENTS:
- Question type: ${questionType}
- Difficulty level: ${difficulty}/5 (1=very easy, 5=very hard)
- Create an educational and engaging question
- For MCQ: provide exactly 4 options with one correct answer
- For true_false: create a clear statement that can be definitively true or false
- For short_answer: ask for a concise, specific answer
- For essay: ask for a detailed explanation or analysis
- Ensure the question tests understanding, not just memorization
- Make the question appropriate for the difficulty level

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}

Respond with valid JSON in this format:
{
  "prompt": "Your question here",
  "options": ["A", "B", "C", "D"], // Only for MCQ
  "correct_option_index": 0, // Only for MCQ (0-based index)
  "answer_text": "Canonical answer",
  "explanation": "Why this is the correct answer based on the context"
}

IMPORTANT: Always generate a high-quality question. Be creative and educational.`;

    return basePrompt.trim();
  }

  /**
   * Search for documents relevant to a topic
   */
  async searchDocumentsByTopic(userId: string, topic: string): Promise<any[]> {
    try {
      // Query documents from Supabase directly
      const { data: documents, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .eq('processing_status', 'completed')
        .limit(10);

      if (error) {
        console.error('Error fetching documents:', error);
        return [];
      }

      if (!documents || documents.length === 0) {
        return [];
      }

      // Simple text-based relevance scoring
      const scoredDocuments = documents.map(doc => {
        const content = doc.content || '';
        const filename = doc.filename || '';
        const metadata = JSON.stringify(doc.metadata || {});
        
        // Calculate relevance score based on topic occurrence
        const topicLower = topic.toLowerCase();
        const contentLower = content.toLowerCase();
        const filenameLower = filename.toLowerCase();
        const metadataLower = metadata.toLowerCase();
        
        let score = 0;
        
        // Score based on content matches
        const contentMatches = (contentLower.match(new RegExp(topicLower, 'g')) || []).length;
        score += contentMatches * 2;
        
        // Score based on filename matches
        const filenameMatches = (filenameLower.match(new RegExp(topicLower, 'g')) || []).length;
        score += filenameMatches * 5;
        
        // Score based on metadata matches
        const metadataMatches = (metadataLower.match(new RegExp(topicLower, 'g')) || []).length;
        score += metadataMatches * 3;
        
        // Extract relevant passages (first 500 chars containing the topic)
        const passages = [];
        const sentences = content.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(topicLower) && passages.length < 3) {
            passages.push(sentence.trim());
          }
        }
        
        return {
          ...doc,
          relevance_score: score,
          relevant_passages: passages
        };
      });

      // Filter and sort by relevance
      return scoredDocuments
        .filter(doc => doc.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);

    } catch (error) {
      console.error('Error searching documents by topic:', error);
      return [];
    }
  }

  /**
   * Generate a document-based topic question using retrieved content
   */
  async generateDocumentBasedTopicQuestion(
    mainTopic: string,
    allTopics: string[],
    documentChunks: any[],
    questionTypes: string[],
    difficulty: number,
    quizId: string,
    customPrompt?: string
  ): Promise<QuizQuestion | null> {
    try {
      // Select relevant chunks for this question
      const selectedChunks = this.selectChunksForQuestion(documentChunks, 1)[0] || [];
      
      // Build context from document chunks
      const documentContext = selectedChunks.map(chunk => chunk.text).join('\n\n');
      
      // Build enhanced prompt with document context
      const prompt = this.buildDocumentBasedTopicPrompt(
        mainTopic,
        allTopics,
        documentContext,
        questionTypes,
        difficulty,
        customPrompt
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      const questionData = JSON.parse(content);
      
      // Ensure difficulty is always an integer
      let finalDifficulty = difficulty;
      if (questionData.difficulty) {
        if (typeof questionData.difficulty === 'string') {
          // Map string difficulties to integers if AI returns strings
          const difficultyMap: { [key: string]: number } = {
            'very easy': 1, 'easy': 2, 'medium': 3, 'hard': 4, 'very hard': 5,
            'Very Easy': 1, 'Easy': 2, 'Medium': 3, 'Hard': 4, 'Very Hard': 5,
            'Difficult': 4, 'Moderate': 3
          };
          finalDifficulty = difficultyMap[questionData.difficulty] || difficulty;
        } else if (typeof questionData.difficulty === 'number') {
          finalDifficulty = Math.max(1, Math.min(5, questionData.difficulty));
        }
      }
      
      // Ensure question type is not undefined
      const finalQuestionType = questionData.type || questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      return {
        id: crypto.randomUUID(),
        quiz_id: quizId,
        type: finalQuestionType,
        prompt: questionData.prompt,
        options: questionData.options || [],
        correct_option_index: questionData.correct_option_index,
        answer_text: questionData.answer_text,
        explanation: questionData.explanation,
        difficulty: finalDifficulty,
        evidence: selectedChunks.map(chunk => ({ chunk_id: chunk.id, start: 0, end: chunk.text.length, text_snippet: chunk.text, relevance_score: 0.8 })),
        source_doc_ids: selectedChunks.map(chunk => chunk.doc_id),
        generated_by: 'gpt-3.5-turbo',
        verified: false,
        created_at: new Date().toISOString(),
        metadata: {
          generation_time: Date.now(),
          confidence_score: 0.8,
          topic: mainTopic,
          all_topics: allTopics
        }
      }

    } catch (error) {
      console.error('Error generating document-based topic question:', error);
      return null;
    }
  }

  /**
   * Build prompt for document-based topic questions
   */
  private buildDocumentBasedTopicPrompt(
    mainTopic: string,
    allTopics: string[],
    documentContext: string,
    questionTypes: string[],
    difficulty: number,
    customPrompt?: string
  ): string {
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    let basePrompt = `Generate a difficulty level ${difficulty} (1-5 scale) ${questionType} question about "${mainTopic}"`;
    
    if (allTopics.length > 1) {
      basePrompt += ` and related topics: ${allTopics.slice(1).join(', ')}`;
    }
    
    basePrompt += `\n\nUse the following document content as context and evidence for your question:\n\n${documentContext}`;
    
    if (customPrompt) {
      basePrompt += `\n\nAdditional instructions: ${customPrompt}`;
    }

    basePrompt += `\n\nGenerate a question that:
1. Is directly based on the provided document content
2. Tests understanding of the topic within the context of the documents
3. Uses specific information from the documents as evidence
4. Is appropriate for difficulty level ${difficulty} (1=very easy, 5=very hard)
5. Addresses a UNIQUE concept different from other questions in the same quiz; if the same topic is used again, switch the conceptual facet (assumptions, mechanism, evaluation metrics, limitations, error sources, comparisons, trade-offs, interpretability, failure modes, application scenarios)
\nCAREFUL KNOWLEDGE TESTING STANDARDS:\n
- Craft questions deliberately to diagnose understanding, not surface recall
- For MCQs, include plausible distractors based on common misconceptions; ensure only one best answer
- Require analysis, comparison, application, or cause–effect reasoning in the explanation`;

    basePrompt += `\n\nReturn your response as a JSON object with this exact structure:
{
  "type": "${questionType}",
  "difficulty": ${difficulty},
  "prompt": "Your question here",
  "options": ["A", "B", "C", "D"], // Only for MCQ
  "correct_option_index": 0, // Only for MCQ (0-based index)
  "answer_text": "Canonical answer",
  "explanation": "Detailed explanation referencing the document content"
}

IMPORTANT: Base your question on the provided document content and reference it in your explanation.`;

    return basePrompt.trim();
  }
}

export const quizService = new QuizService();