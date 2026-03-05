import React, { useEffect, useRef } from 'react';

interface ActionLogsProps {
    logs: string[];
}

export const ActionLogs: React.FC<ActionLogsProps> = ({ logs }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="action-logs h-full">
            <div className="logs-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                    <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '13px' }}>System Terminal</span>
                </div>
            </div>
            <div className="logs-content" ref={contentRef}>
                {logs.length === 0 && <div style={{ color: '#64748b', fontStyle: 'italic' }}>시스템 작동 대기 중...</div>}
                {logs.map((log, index) => {
                    const isError = log.includes('❌') || log.includes('Error') || log.includes('Failed') || log.includes('에러');
                    const isSuccess = log.includes('✅') || log.includes('Success') || log.includes('🎉') || log.includes('완료') || log.includes('성공');
                    let textClass = '';
                    if (isError) textClass = 'log-error';
                    else if (isSuccess) textClass = 'log-success';
                    else if (log.includes('🔍') || log.includes('⏳') || log.includes('수집 중') || log.includes('업로드 중')) textClass = 'log-info';
                    else textClass = 'text-slate-300';

                    return (
                        <div key={index} className="log-entry animate-slide-in-right" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <span className={textClass}>{log}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
