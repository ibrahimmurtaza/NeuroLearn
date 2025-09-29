# Quiz Module Schema Analysis Report

## Executive Summary
This report analyzes the provided quiz module table schema against the existing codebase implementation to identify inconsistencies, missing fields, incorrect data types, and structural issues.

## 1. STRUCTURAL DIFFERENCES BETWEEN PROVIDED SCHEMA AND EXISTING MIGRATION

### 1.1 Table Structure Comparison

#### `quiz_quizzes` Table Issues:

**CRITICAL INCONSISTENCY - Field Naming:**
- **Provided Schema**: Uses `owner_id` field
- **Existing Code**: Expects `user_id` and `creator_id` fields
- **Impact**: The quizService.ts createQuizRecord method tries to insert both `user_id` and `creator_id`, but provided schema only has `owner_id`
- **Evidence**: Line 175-176 in quizService.ts shows: `user_id: request.user_id, creator_id: request.user_id`

**MISSING ESSENTIAL FIELDS in Provided Schema:**
- `document_ids` (UUID[]) - Required by createQuizRecord method
- `mode` (VARCHAR) - Required for quiz mode (timed/untimed)
- `time_limit` (INTEGER) - Required for timed quizzes
- `status` (VARCHAR) - Required for quiz lifecycle management
- `settings` (JSONB) - Required for quiz configuration

#### `quiz_questions` Table Issues:

**CRITICAL INCONSISTENCY - Field Naming:**
- **Provided Schema**: Uses `author_id` field
- **Existing Code**: Expects `quiz_id` field (which exists) but also expects specific field names for saving
- **Missing Fields**: 
  - `options` (JSONB) - Required for MCQ questions
  - `correct_option_index` (INTEGER) - Required for MCQ answers
  - `answer_text` (TEXT) - Required for canonical answers
  - `difficulty` (INTEGER) - Required for difficulty levels
  - `source_doc_ids` (UUID[]) - Required for traceability
  - `generated_by` (VARCHAR) - Required for model tracking
  - `verified` (BOOLEAN) - Required for quality control
  - `verification_reason` (TEXT) - Required for failed verifications

#### `quiz_question_evidence` Table Issues:

**FIELD NAMING INCONSISTENCIES:**
- **Provided Schema**: Uses `uploaded_by` field
- **Expected Usage**: Should be linked to questions, not uploaded by users
- **Missing Fields**:
  - `chunk_id` (BIGINT) - Required for linking to document chunks
  - `start_pos` (INTEGER) - Required for text position
  - `end_pos` (INTEGER) - Required for text position  
  - `text_snippet` (TEXT) - Required for evidence display

#### `quiz_chunks` Table Issues:

**CRITICAL FIELD NAMING:**
- **Provided Schema**: Uses `document_id` field
- **Existing Code**: Expects `doc_id` field
- **Evidence**: Line 220 in quizService.ts shows: `.in('doc_id', docIds)`

#### `quiz_attempts` Table Issues:

**MISSING ESSENTIAL FIELDS:**
- `answers` (JSONB) - Required for storing user responses
- `percentage` (NUMERIC) - Required for score calculation
- `time_taken` (INTEGER) - Required for performance tracking

#### `quiz_attempt_answers` Table Issues:

**INCONSISTENT FIELD NAMING:**
- **Provided Schema**: Uses `selected_choice_id` (BIGINT)
- **Expected Usage**: Should be `selected` (INTEGER) for option index
- **Missing Fields**:
  - `time_taken_ms` (INTEGER) - Required for timing analysis
  - `confidence` (NUMERIC) - Optional but used in types

## 2. DATA TYPE INCONSISTENCIES

### 2.1 Primary Key Type Mismatches

#### Critical Issue: BIGINT vs UUID
- **Provided Schema**: All primary keys use `bigint GENERATED ALWAYS AS IDENTITY`
- **TypeScript Interfaces**: All IDs expected as `string` (UUID format)
- **Impact**: Complete type system breakdown between database and application
- **Evidence**: All interfaces in `types/quiz.ts` define `id: string`

**Affected Tables:**
- `quiz_quizzes.id`: bigint → should be UUID
- `quiz_questions.id`: bigint → should be UUID  
- `quiz_documents.id`: bigint → should be UUID
- `quiz_chunks.id`: bigint → should be UUID
- `quiz_attempts.id`: bigint → should be UUID
- `quiz_attempt_answers.id`: bigint → should be UUID
- `quiz_question_flags.id`: bigint → should be UUID
- `quiz_question_evidence.id`: bigint → should be UUID
- `quiz_user_stats.id`: bigint → should be UUID

### 2.2 Missing Array Types

#### Required Array Fields Not Defined:
- `quiz_quizzes.document_ids`: Should be `UUID[]` - MISSING
- `quiz_questions.options`: Should be `TEXT[]` - MISSING
- `quiz_questions.source_doc_ids`: Should be `UUID[]` - MISSING

#### PostgreSQL Array Syntax Required:
```sql
document_ids UUID[],
options TEXT[],
source_doc_ids UUID[]
```

### 2.3 JSONB vs TEXT Inconsistencies

#### Fields That Should Be JSONB:
- `quiz_questions.options`: Currently missing, should be `JSONB` for complex option objects
- `quiz_attempts.answers`: Currently missing, should be `JSONB` for user responses
- `quiz_attempt_answers.metadata`: Currently `JSONB` ✓ (correct)
- `quiz_question_evidence.evidence`: Currently `JSONB` ✓ (correct)

### 2.4 Numeric Type Precision Issues

#### Score and Percentage Fields:
- `quiz_attempts.score`: `numeric` (no precision specified)
- `quiz_user_stats.best_score`: `numeric` (no precision specified)
- **Recommendation**: Use `NUMERIC(5,2)` for percentage scores (0.00-100.00)

### 2.5 Timestamp Consistency

#### Timestamp Fields Analysis:
- **Provided Schema**: Uses `timestamp with time zone` ✓ (correct)
- **TypeScript Interfaces**: Expects `Date` objects ✓ (compatible)
- **Consistency**: Good alignment between schema and interfaces

### 2.6 Boolean Type Issues

#### Missing Boolean Fields:
- `quiz_questions.verified`: Should be `BOOLEAN` - MISSING
- `quiz_attempt_answers.is_correct`: Currently `BOOLEAN` ✓ (correct)
- `quiz_question_flags.resolved`: Currently `BOOLEAN` ✓ (correct)

### 2.7 Integer Type Requirements

#### Missing Integer Fields:
- `quiz_quizzes.time_limit`: Should be `INTEGER` (minutes) - MISSING
- `quiz_questions.difficulty`: Should be `INTEGER` (1-5 scale) - MISSING
- `quiz_questions.correct_option_index`: Should be `INTEGER` - MISSING
- `quiz_chunks.chunk_index`: Currently `INTEGER` ✓ (correct)
- `quiz_user_stats.attempts_count`: Currently `INTEGER` ✓ (correct)

### 2.8 Text vs VARCHAR Considerations

#### Current Usage Analysis:
- **Provided Schema**: Uses `text` for most string fields ✓ (appropriate)
- **Recommendation**: Continue using `text` for flexibility
- **Exception**: Consider `VARCHAR(50)` for status/enum fields

### 2.9 Vector Type for Embeddings

#### Embedding Storage:
- `quiz_chunks.embedding`: `vector(384)` ✓ (correct)
- **Note**: Requires `pgvector` extension
- **Compatibility**: Aligns with embedding service expectations

## 3. FOREIGN KEY RELATIONSHIP ISSUES

### 3.1 Missing Relationships
- `quiz_questions.quiz_id` → `quiz_quizzes.id` (EXISTS - OK)
- `quiz_chunks.doc_id` → `quiz_documents.id` (MISSING in provided schema)
- `quiz_question_evidence.question_id` → `quiz_questions.id` (EXISTS - OK)

### 3.2 Incorrect Relationships
- `quiz_question_evidence.uploaded_by` → Should not reference `auth.users`
- Should be system-generated, not user-uploaded

## 4. MISSING ESSENTIAL FUNCTIONALITY FIELDS

### 4.1 Quiz Generation Requirements
- `quiz_quizzes.document_ids` - MISSING
- `quiz_quizzes.mode` - MISSING  
- `quiz_quizzes.time_limit` - MISSING
- `quiz_quizzes.settings` - MISSING

### 4.2 Question Management Requirements
- `quiz_questions.options` - MISSING
- `quiz_questions.correct_option_index` - MISSING
- `quiz_questions.answer_text` - MISSING
- `quiz_questions.difficulty` - MISSING
- `quiz_questions.verified` - MISSING

### 4.3 Evidence Tracking Requirements
- `quiz_question_evidence.chunk_id` - MISSING
- `quiz_question_evidence.start_pos` - MISSING
- `quiz_question_evidence.end_pos` - MISSING
- `quiz_question_evidence.text_snippet` - MISSING

## 5. INDEX OPTIMIZATION ISSUES

### 5.1 Missing Performance Indexes
- `quiz_questions(type)` - For filtering by question type
- `quiz_questions(difficulty)` - For difficulty-based queries
- `quiz_questions(verified)` - For quality filtering
- `quiz_attempts(status)` - For attempt status queries
- `quiz_chunks(doc_id, chunk_index)` - For ordered chunk retrieval

## 6. ROW LEVEL SECURITY (RLS) POLICY ISSUES

### 6.1 Overly Permissive Policies
- `quiz_questions` SELECT policy allows all authenticated users
- Should be restricted to quiz owners or participants

### 6.2 Missing Policies
- No policies for `quiz_chunks` table operations
- Missing policies for evidence management

## 7. DETAILED FIELD NAMING ANALYSIS

### 7.1 Critical Field Name Mismatches

#### `quiz_quizzes` Table:
- **Provided**: `owner_id` 
- **Expected**: `user_id` (from QuizService.createQuizRecord)
- **Impact**: INSERT operations will fail
- **Evidence**: Line 175 in quizService.ts expects `user_id`

#### `quiz_questions` Table:
- **Provided**: `question_text`
- **Expected**: `prompt` (from saveQuestionsToDatabase method)
- **Impact**: Question saving will fail
- **Evidence**: Line 500+ in quizService.ts uses `prompt` field

- **Provided**: `question_type`
- **Expected**: `type` (from QuizQuestion interface)
- **Impact**: Type mismatch in data insertion

#### `quiz_chunks` Table:
- **Provided**: `document_id`
- **Expected**: `doc_id` (from retrieveRelevantChunks method)
- **Impact**: Chunk retrieval queries will fail
- **Evidence**: Line 220 in quizService.ts: `.in('doc_id', docIds)`

### 7.2 TypeScript Interface Alignment Issues

#### Quiz Interface Expectations (from types/quiz.ts):
```typescript
interface Quiz {
  id: string;           // Provided schema: bigint
  title: string;        // ✓ Matches
  description?: string; // ✓ Matches
  user_id: string;      // Provided schema: owner_id
  document_ids: string[]; // MISSING in provided schema
  mode: QuizMode;       // MISSING in provided schema
  time_limit?: number;  // MISSING in provided schema
  status: QuizStatus;   // MISSING in provided schema
  settings: QuizSettings; // MISSING in provided schema
  metadata: QuizMetadata; // ✓ Matches (as jsonb)
}
```

#### QuizQuestion Interface Expectations:
```typescript
interface QuizQuestion {
  id: string;                    // Provided schema: bigint
  quiz_id: string;              // ✓ Matches (but bigint vs string)
  type: QuestionType;           // Provided schema: question_type
  prompt: string;               // Provided schema: question_text
  options?: string[];           // MISSING in provided schema
  correct_option_index?: number; // MISSING in provided schema
  answer_text?: string;         // MISSING in provided schema
  difficulty: DifficultyLevel;  // MISSING in provided schema
  source_doc_ids: string[];     // MISSING in provided schema
  evidence: QuestionEvidence[]; // Different structure in provided schema
}
```

### 7.3 Service Method Field Expectations

#### createQuizRecord Method Fields:
- `user_id` (not `owner_id`)
- `creator_id` (not in provided schema)
- `document_ids` (not in provided schema)
- `mode` (not in provided schema)
- `settings` (not in provided schema)

#### saveQuestionsToDatabase Method Fields:
- `prompt` (not `question_text`)
- `type` (not `question_type`)
- `options` (not in provided schema)
- `correct_option_index` (not in provided schema)
- `answer_text` (not in provided schema)
- `difficulty` (not in provided schema)
- `source_doc_ids` (not in provided schema)
- `generated_by` (not in provided schema)
- `verified` (not in provided schema)
- `verification_reason` (not in provided schema)

## RECOMMENDATIONS

### CRITICAL FIXES REQUIRED:
1. **Rename Fields**: 
   - `quiz_quizzes.owner_id` → `user_id`
   - `quiz_questions.question_text` → `prompt`
   - `quiz_questions.question_type` → `type`
   - `quiz_questions.author_id` → Remove (not needed)
   - `quiz_chunks.document_id` → `doc_id`
   - `quiz_question_evidence.uploaded_by` → Remove (system generated)

2. **Add Missing Fields**: All fields identified in sections 4.1-4.3
3. **Fix Data Types**: Change primary keys to UUID, add array types
4. **Add Missing Indexes**: Performance-critical indexes identified
5. **Tighten RLS Policies**: Implement proper access control

### MEDIUM PRIORITY:
1. **Optimize Indexes**: Add composite indexes for common query patterns
2. **Review Evidence Model**: Simplify evidence tracking approach
3. **Standardize Naming**: Ensure consistent field naming across all tables

### IMMEDIATE ACTION REQUIRED:
The provided schema has **CRITICAL INCOMPATIBILITIES** with the existing codebase. The quiz module will **NOT FUNCTION** with this schema due to:
- Field name mismatches preventing INSERT/SELECT operations
- Missing essential fields required by core functionality
- Data type incompatibilities between database and TypeScript interfaces

This analysis shows the provided schema requires substantial modifications before it can support the existing quiz module implementation.