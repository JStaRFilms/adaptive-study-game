
import React, { useMemo, useState } from 'react';
import { QuizResult, StudySet } from '../types';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-surface-dark p-4 rounded-xl shadow-lg flex items-center gap-4">
        <div className="p-3 bg-gray-900/50 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const TopicPerformanceBar: React.FC<{ topic: string; accuracy: number; total: number; }> = ({ topic, accuracy, total }) => {
    let barColor = 'bg-correct';
    if (accuracy < 75) barColor = 'bg-yellow-400';
    if (accuracy < 50) barColor = 'bg-incorrect';
    return (
        <div className="bg-gray-900/50 p-3 rounded-md">
            <div className="flex justify-between items-baseline mb-1">
                <p className="font-semibold text-text-primary truncate" title={topic}>{topic}</p>
                <p className="text-sm font-bold text-text-secondary">{accuracy}%</p>
            </div>
            <div className="relative w-full h-2 bg-gray-700 rounded-full">
                <div className={`absolute top-0 left-0 h-full rounded-full ${barColor}`} style={{ width: `${accuracy}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{total} questions</p>
        </div>
    );
};

const AnalyticsChart: React.FC<{ 
    dataPoints: { date: Date; accuracy: number }[],
    minDate: number,
    maxDate: number
}> = ({ dataPoints, minDate, maxDate }) => {
    const width = 500;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xScale = (date: number) => {
        if (maxDate === minDate) return padding.left + chartWidth / 2;
        return padding.left + ((date - minDate) / (maxDate - minDate)) * chartWidth;
    };

    const yScale = (accuracy: number) => {
        return padding.top + chartHeight - (accuracy / 100) * chartHeight;
    };

    const pathData = dataPoints.length > 1 
        ? "M" + dataPoints.map(d => `${xScale(d.date.getTime())},${yScale(d.accuracy)}`).join(" L ")
        : "";

    const yAxisLabels = [0, 25, 50, 75, 100];

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-labelledby="chart-title" role="img">
            <title id="chart-title">Line chart showing quiz accuracy over time.</title>
            {/* Y Axis Grid Lines & Labels */}
            {yAxisLabels.map(label => (
                <g key={label} className="text-gray-600">
                    <line x1={padding.left} x2={width - padding.right} y1={yScale(label)} y2={yScale(label)} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3" />
                    <text x={padding.left - 8} y={yScale(label) + 4} textAnchor="end" fill="currentColor" className="text-[10px] font-sans">{label}%</text>
                </g>
            ))}
            
            {/* X Axis Line & Labels */}
            <g className="text-gray-500">
                <line x1={padding.left} x2={width-padding.right} y1={height - padding.bottom} y2={height-padding.bottom} stroke="currentColor" strokeWidth="1" />
                {dataPoints.length > 0 && (
                    <g className="text-[10px] font-sans" fill="currentColor">
                        <text x={padding.left} y={height - padding.bottom + 15} textAnchor="start">
                            {formatDate(new Date(minDate))}
                        </text>
                        <text x={width - padding.right} y={height - padding.bottom + 15} textAnchor="end">
                            {formatDate(new Date(maxDate))}
                        </text>
                    </g>
                )}
            </g>
            
            {/* Data Path */}
            <path d={pathData} fill="none" stroke="url(#line-gradient)" strokeWidth="2" />
             <defs>
                <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>

            {/* Data Points */}
            {dataPoints.map((d, i) => (
                 <circle key={i} cx={xScale(d.date.getTime())} cy={yScale(d.accuracy)} r="3" fill="#14b8a6" stroke="#111827" strokeWidth="1" />
            ))}
        </svg>
    );
};


const StatsScreen: React.FC<{ history: QuizResult[], studySets: StudySet[], onBack: () => void }> = ({ history, studySets, onBack }) => {
    const [selectedSetId, setSelectedSetId] = useState<string>('ALL');

    const filteredHistory = useMemo(() => {
        if (selectedSetId === 'ALL') {
            return history;
        }
        return history.filter(h => h.studySetId === selectedSetId);
    }, [history, selectedSetId]);

    const stats = useMemo(() => {
        if (!filteredHistory || filteredHistory.length === 0) {
            return null;
        }

        const totalQuizzes = filteredHistory.length;
        const totalAccuracy = filteredHistory.reduce((sum, result) => sum + result.accuracy, 0);
        const overallAverageAccuracy = totalQuizzes > 0 ? Math.round(totalAccuracy / totalQuizzes) : 0;
        const totalQuestionsAnswered = filteredHistory.reduce((sum, result) => sum + result.answerLog.length, 0);
        
        const displayStudySetCount = selectedSetId === 'ALL' ? studySets.length : 1;

        const performanceData = filteredHistory
            .map(h => ({ date: new Date(h.date), accuracy: h.accuracy }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        const [minDate, maxDate] = (() => {
            if (performanceData.length === 0) return [0, 0];
            const dates = performanceData.map(d => d.date.getTime());
            return [Math.min(...dates), Math.max(...dates)];
        })();

        const topicStats: { [topic: string]: { correct: number, total: number } } = {};
        filteredHistory.forEach(result => {
            result.answerLog.forEach(log => {
                const topic = log.question.topic || 'Uncategorized';
                if (!topicStats[topic]) {
                    topicStats[topic] = { correct: 0, total: 0 };
                }
                topicStats[topic].total++;
                if (log.isCorrect) {
                    topicStats[topic].correct++;
                }
            });
        });

        const topicPerformance = Object.entries(topicStats).map(([topic, data]) => ({
            topic,
            ...data,
            accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
        })).sort((a, b) => b.accuracy - a.accuracy);
        
        const strengths = topicPerformance.filter(t => t.accuracy >= 75).sort((a,b) => b.accuracy - a.accuracy);
        const weaknesses = topicPerformance.filter(t => t.accuracy < 75).sort((a,b) => a.accuracy - b.accuracy);
        
        const currentSet = studySets.find(s => s.id === selectedSetId);
        const title = selectedSetId === 'ALL' ? 'Overall Performance' : `Performance for "${currentSet?.name}"`;

        return {
            title,
            displayStudySetCount,
            totalQuizzes,
            overallAverageAccuracy,
            totalQuestionsAnswered,
            performanceData,
            minDate,
            maxDate,
            strengths,
            weaknesses,
        };
    }, [filteredHistory, studySets, selectedSetId]);

    if (!stats && filteredHistory.length === 0) {
        return (
            <div className="animate-fade-in space-y-8 pb-8">
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                     <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Performance Stats</h1>
                     <button onClick={onBack} className="px-5 py-2.5 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-500 transition-all w-full sm:w-auto">
                        ← Back to Sets
                    </button>
                </header>
                 <div className="flex flex-col items-center justify-center text-center h-full bg-surface-dark rounded-xl py-16">
                    <div className="mb-4">
                        <label htmlFor="set-filter" className="block text-sm font-medium text-text-secondary mb-1">
                            Showing stats for:
                        </label>
                        <select
                            id="set-filter"
                            value={selectedSetId}
                            onChange={(e) => setSelectedSetId(e.target.value)}
                            className="bg-gray-900 border-2 border-gray-700 text-text-primary text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full max-w-xs p-2.5"
                        >
                            <option value="ALL">All Sets</option>
                            {studySets.map(set => (
                                <option key={set.id} value={set.id}>{set.name}</option>
                            ))}
                        </select>
                    </div>
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">No Stats to Show Yet</h2>
                    <p className="text-text-secondary mb-6">Complete a quiz in this set to start tracking your performance.</p>
                </div>
            </div>
        );
    }
    
    if (!stats) return null; // Should not happen if filteredHistory has items, but a good guard

    return (
        <div className="animate-fade-in space-y-8 pb-8">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-grow">
                    <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">{stats.title}</h1>
                    <div className="mt-2 max-w-xs">
                        <label htmlFor="set-filter-main" className="sr-only">Filter by Study Set</label>
                        <select
                            id="set-filter-main"
                            value={selectedSetId}
                            onChange={(e) => setSelectedSetId(e.target.value)}
                            className="bg-gray-900 border border-gray-700 text-text-secondary text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2"
                        >
                            <option value="ALL">All Study Sets</option>
                            {studySets.map(set => (
                                <option key={set.id} value={set.id}>{set.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button onClick={onBack} className="px-5 py-2.5 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-500 transition-all self-start sm:self-center w-full sm:w-auto">
                    ← Back to Sets
                </button>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Study Sets" value={stats.displayStudySetCount} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-brand-primary"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036-.84-1.875-1.875-1.875H5.625z" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-3.434-1.279h-1.875a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036-.84-1.875-1.875-1.875h-.156c.619.47.981 1.2.981 1.969v.447z" /></svg>} />
                <StatCard title="Quizzes Taken" value={stats.totalQuizzes} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-brand-primary"><path fillRule="evenodd" d="M3.75 4.5a.75.75 0 01.75-.75h.75c8.284 0 15 6.716 15 15V21a.75.75 0 01-1.5 0v-.75c0-7.466-6.034-13.5-13.5-13.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /><path d="M11.25 4.5a.75.75 0 01.75-.75h.75c4.142 0 7.5 3.358 7.5 7.5V21a.75.75 0 01-1.5 0v-8.25c0-3.308-2.692-6-6-6h-.75a.75.75 0 01-.75-.75zM4.5 4.5a3.75 3.75 0 00-3.75 3.75v.75a.75.75 0 001.5 0v-.75A2.25 2.25 0 014.5 6h.75a.75.75 0 000-1.5H4.5z" /></svg>} />
                <StatCard title="Avg. Accuracy" value={`${stats.overallAverageAccuracy}%`} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-brand-primary"><path d="M12.378 1.602a.75.75 0 00-.756 0L3 7.25V18a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75V7.25l-8.622-5.648zM12 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0112 6zM12 12.25a.75.75 0 01.75.75v.008a.75.75 0 01-1.5 0v-.008a.75.75 0 01.75-.75z" /></svg>} />
                <StatCard title="Questions Answered" value={stats.totalQuestionsAnswered} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-brand-primary"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>} />
            </section>

            <section className="bg-surface-dark p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-text-primary mb-2">Accuracy Over Time</h2>
                <AnalyticsChart 
                    dataPoints={stats.performanceData}
                    minDate={stats.minDate}
                    maxDate={stats.maxDate}
                />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface-dark p-4 sm:p-6 rounded-xl shadow-lg">
                     <h2 className="text-xl font-bold text-text-primary mb-4">Topic Strengths</h2>
                     <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {stats.strengths.length > 0 ? (
                            stats.strengths.map(t => <TopicPerformanceBar key={t.topic} {...t} />)
                        ) : (
                            <p className="text-text-secondary text-center py-8">Keep studying to build up your strengths!</p>
                        )}
                     </div>
                </div>
                 <div className="bg-surface-dark p-4 sm:p-6 rounded-xl shadow-lg">
                     <h2 className="text-xl font-bold text-text-primary mb-4">Areas for Improvement</h2>
                     <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                         {stats.weaknesses.length > 0 ? (
                            stats.weaknesses.map(t => <TopicPerformanceBar key={t.topic} {...t} />)
                        ) : (
                            <p className="text-text-secondary text-center py-8">Great job! No specific weaknesses found.</p>
                        )}
                     </div>
                </div>
            </section>
        </div>
    );
};

export default StatsScreen;
