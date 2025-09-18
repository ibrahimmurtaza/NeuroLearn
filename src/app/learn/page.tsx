import { BookOpen, Clock, Target, TrendingUp, Award, Play } from 'lucide-react';
import Link from 'next/link';

export default function LearnPage() {
  const activeModules = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      progress: 65,
      timeLeft: '2 hours',
      nextLesson: 'Neural Networks Basics',
      difficulty: 'Beginner',
      category: 'Technology'
    },
    {
      id: 2,
      title: 'Web Development Fundamentals',
      progress: 40,
      timeLeft: '4 hours',
      nextLesson: 'JavaScript ES6 Features',
      difficulty: 'Intermediate',
      category: 'Programming'
    },
    {
      id: 3,
      title: 'Data Science with Python',
      progress: 80,
      timeLeft: '1 hour',
      nextLesson: 'Final Project Review',
      difficulty: 'Advanced',
      category: 'Data Science'
    }
  ];

  const recommendedContent = [
    {
      id: 1,
      title: 'AI Ethics and Bias',
      type: 'Interactive Module',
      duration: '45 min',
      difficulty: 'Intermediate',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 2,
      title: 'Advanced React Patterns',
      type: 'Video Series',
      duration: '2 hours',
      difficulty: 'Advanced',
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 3,
      title: 'Statistics for Data Science',
      type: 'Practice Lab',
      duration: '90 min',
      difficulty: 'Intermediate',
      thumbnail: '/api/placeholder/300/200'
    }
  ];

  const learningStats = {
    totalHours: 127,
    completedCourses: 8,
    currentStreak: 12,
    skillPoints: 2450
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Continue Learning</h1>
          <p className="text-gray-600">Pick up where you left off and keep building your skills</p>
        </div>

        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{learningStats.totalHours}</p>
                <p className="text-sm text-gray-600">Hours Learned</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{learningStats.completedCourses}</p>
                <p className="text-sm text-gray-600">Courses Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{learningStats.currentStreak}</p>
                <p className="text-sm text-gray-600">Day Streak</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{learningStats.skillPoints}</p>
                <p className="text-sm text-gray-600">Skill Points</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Learning Modules */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-6">Continue Learning</h2>
              <div className="space-y-6">
                {activeModules.map((module) => (
                  <div key={module.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {module.category}
                          </span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                            {module.difficulty}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">Next: {module.nextLesson}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {module.timeLeft} left
                          </div>
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            {module.progress}% complete
                          </div>
                        </div>
                      </div>
                      
                      <Link 
                        href={`/learn/${module.id}`}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Link>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{width: `${module.progress}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-6">Recommended for You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendedContent.map((content) => (
                  <div key={content.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-32 bg-gradient-to-br from-blue-400 to-purple-500"></div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {content.type}
                        </span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                          {content.difficulty}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2">{content.title}</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {content.duration}
                      </div>
                      <button className="w-full mt-4 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200">
                        Start Learning
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Daily Goal */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Goal</h3>
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.75)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-semibold">75%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">45 min of 60 min goal</p>
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="bg-yellow-100 rounded-full p-2 mr-3">
                    <Award className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Course Completed</p>
                    <p className="text-xs text-gray-600">Web Development Basics</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">10-Day Streak</p>
                    <p className="text-xs text-gray-600">Keep it up!</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="bg-purple-100 rounded-full p-2 mr-3">
                    <Target className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Skill Milestone</p>
                    <p className="text-xs text-gray-600">2000 points reached</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/courses" 
                  className="block w-full text-left p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium">Browse Courses</span>
                  </div>
                </Link>
                <Link 
                  href="/assignments" 
                  className="block w-full text-left p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">View Assignments</span>
                  </div>
                </Link>
                <Link 
                  href="/gamification" 
                  className="block w-full text-left p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium">Check Achievements</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}