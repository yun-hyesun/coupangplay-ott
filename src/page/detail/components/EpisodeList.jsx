import React from "react";
import { Link } from "react-router-dom";
import { episodeData } from "../../../data/EpisodeData";
import "../scss/EpisodeList.scss";

export const EpisodeList = () => {
    return (
        <div className="episode-list">
            <h2 className="episode-list-heading">회차</h2>

            <ul className="episode-list-items">
                {episodeData.map((episode) => (
                    <li className="episode-card" key={episode.id}>
                        <Link
                            className="episode-card-link"
                            to={`/watch/sample-series/episode/${episode.id}`}
                        >
                            <div className="episode-card-thumbnail">
                                <img
                                    src={episode.thumbnail}
                                    alt=""
                                    loading="lazy"
                                />

                                <span
                                    className="episode-card-play"
                                    aria-hidden="true"
                                >
                                    ▶
                                </span>
                            </div>

                            <div className="episode-card-info">
                                <div className="episode-card-header">
                                    <h3 className="episode-card-title">
                                        {episode.title}
                                    </h3>

                                    <span className="episode-card-duration">
                                        {episode.duration}분
                                    </span>
                                </div>

                                <p className="episode-card-description">
                                    {episode.description}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};