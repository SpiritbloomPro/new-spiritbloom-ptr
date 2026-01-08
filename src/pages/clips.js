import React, {useState, useEffect, useRef} from 'react';
import ClipCodes from '@site/static/clips.json';
import Layout from '@theme/Layout';

function Clip({code, index, hidden, onOpen}){
    const src = `https://i.imgur.com/${code}.mp4`;
    return (
        <div className={`clip-item clip-${index}${hidden ? ' hidden-clip' : ''}`} onClick={() => onOpen(src)}>
            <video className='h-100 w-100' preload={hidden ? 'none' : 'metadata'} loop muted onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()}>
                <source src={src} />
            </video>
        </div>
    )
}

export default function Clips(){
    const INITIAL_VISIBLE = 12;
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
    const [modalSrc, setModalSrc] = useState(null);
    const containerRef = useRef(null);

    const total = ClipCodes.length;
    const prevVisibleRef = useRef(Math.min(INITIAL_VISIBLE, total));
    useEffect(() => {
        // Only load videos that were just revealed by increasing visibleCount
        const container = containerRef.current;
        if (!container) return;
        const prev = prevVisibleRef.current;
        const start = Math.max(prev, 0);
        const end = Math.min(visibleCount, total);
        for (let i = start; i < end; i++){
            const clip = container.querySelector(`.clip-${i + 1} video`);
            if (clip){
                try { clip.load(); } catch (e) {}
            }
        }
        prevVisibleRef.current = visibleCount;
    }, [visibleCount, total]);

    function openModal(src){
        setModalSrc(src);
    }

    function closeModal(e){
        setModalSrc(null);
    }

    function handleShowMore(){
        setVisibleCount(prev => Math.min(total, prev + 12));
    }

    return (
        <Layout
            title={`Clip Collection`}
            description="Funny and interesting short video archive">
            <main>
                <h2 className='clips-title'>Collection of funny or interesting clips. Mouseover to play, click to enlarge</h2>
                <div className="clips-container" ref={containerRef}>
                    {ClipCodes.map((code, i) => (
                        <Clip key={i} code={code} index={i + 1} hidden={i >= visibleCount} onOpen={openModal} />
                    ))}
                </div>

                {visibleCount < total && (
                    <div className="load-more-wrap">
                        <button id="load-more-button" onClick={handleShowMore}>Show more</button>
                    </div>
                )}

                {modalSrc && (
                    <div className="modal-container" style={{display: 'flex'}} onClick={closeModal}>
                        <div className="modal-inner">
                            <video className="full-screen-clip" loop muted autoPlay>
                                <source src={modalSrc} />
                            </video>
                        </div>
                    </div>
                )}
            </main>
        </Layout>
    )
}