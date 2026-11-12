import { Link } from 'react-router-dom';
import { storeChannelPasses } from '../storePassConfig';
import '../scss/StoreChannelPasses.scss';

export const StoreChannelPasses = () => (
    <section
        className="store-channel-passes"
        aria-labelledby="store-channel-passes-title"
    >
        <div className="store-channel-passes__header">
            <h2 id="store-channel-passes-title">
                채널 패스로 골라보기
            </h2>

            <Link
                to="/my/subscription/passes"
                className="store-channel-passes__more"
            >
                구독채널 둘러보기
            </Link>
        </div>

        <div className="store-channel-passes__grid">
            {storeChannelPasses.map((pass) => (
                <Link
                    key={pass.id}
                    className="store-channel-passes__card"
                    to={pass.path}
                    aria-label={`${pass.name} 채널로 이동`}
                >
                    <span className="store-channel-passes__logo" aria-hidden="true">
                        <span
                            className={`store-channel-passes__brand store-channel-passes__brand--${pass.brand}`}
                        />
                    </span>

                    <span className="store-channel-passes__description">
                        {pass.description}
                    </span>
                </Link>
            ))}
        </div>
    </section>
);