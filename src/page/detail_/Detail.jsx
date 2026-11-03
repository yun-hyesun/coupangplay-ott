import React, { useState } from 'react'
import "./scss/Detail.scss"
import { EpisodeList } from './components/EpisodeList';
import { CommentList } from './components/CommentList';

export const Detail = () => {
    const [isCommentOpen, setIsCommentOpen] = useState(false);

    return (
        <main className="detail">
            <section className="episodes-list">
                {/* 회차 목록 */}
                <EpisodeList />
            </section>

            <section className="comments-list">
                <button
                    type="button"
                    aria-expanded={isCommentOpen}
                    aria-controls="detail-comment-list"
                    onClick={() => setIsCommentOpen((prev) => !prev)}
                >
                    댓글 {isCommentOpen ? "접기" : "보기"}
                </button>

                <div id="detail-comment-list" hidden={!isCommentOpen}>
                    {/* 댓글 목록 */}
                    <CommentList />
                </div>
            </section>
        </main>
    );
};