import { renderWidget, useSyncedStorageState } from '@remnote/plugin-sdk';
import { useState } from 'react';
import { Buffer } from 'buffer';
import { UserToken } from '../utils/interfaces';
import { setUserToken } from '../funcs/sessions';
import { discordUrl } from '../utils/constants';

function DiscordAuthPopup() {
	const [code, setCode] = useState('');
	const [userToken, setUserToken] = useSyncedStorageState<UserToken | undefined>(
		'userToken',
		undefined
	);
	const [lastTokenRefreshTime, setLastTokenRefreshTime] = useSyncedStorageState<Date | undefined>(
		'lastTokenRefreshTime',
		undefined
	);

	const handleSubmit = () => {
		// handle code submission
		let userJson = JSON.parse(Buffer.from(code, 'base64').toString('utf-8'));
		// this will be a base 64 encoded string
		// what we need to do is decode it, and then parse it as json. Then we will have the access and refresh tokens

		const newUserToken: UserToken = {
			...userJson,
		};

		setUserToken(newUserToken);
		setLastTokenRefreshTime(new Date());
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	};

	const handleLinkDiscord = () => {
		window.open(discordUrl, '_blank');
	};

	return (
		<div className={`App grid transition-all duration-500 ease-in-out`} style={{ height: '100vh' }}>
			<main className="flex flex-col justify-center items-center bg-gradient-to-b from-ctp-base to-ctp-crust p-6 transition-all duration-500 ease-in-out"></main>
			<div id="card" className="from-ctp-mantle to-ctp-crust outline-ctp-green">
				<h1 className="from-ctp-green to-ctp-blue text-center">RemCord Login</h1>

				<>
					<p>
						<span className="text-ctp-text">
							Click the button below to link your Discord account to RemCord!
						</span>
					</p>
					<p>
						<a href="TODO: HREF For YOUTUBE VID" className="text-ctp-red">
							Youtube Tutorial
						</a>
					</p>
					<div className="">
						<button
							className="bg-ctp-blue hover:bg-ctp-green active:bg-ctp-blue/75 m-2 text-ctp-text"
							onClick={handleLinkDiscord}
						>
							Link Discord Account and Get Code
						</button>
					</div>
					<div className=" font-mono rounded-sm left-0 text-center">
						<div className="max-w-[500px]">
							<span className="from-ctp-green to-ctp-blue highlight-grad break-words">
								<input
									type="text"
									value={code}
									placeholder="Enter Code Here"
									className="font-bold py-4 px-4"
									onKeyDown={handleKeyDown}
									style={
										{
											borderRadius: '50px',
											background: '',
											color: '#000000',
										} as any
									}
									onChange={(e) => setCode(e.target.value)}
								/>
							</span>
						</div>
					</div>

					<div className="">
						<button
							className="bg-ctp-teal hover:bg-ctp-green active:bg-ctp-blue/75 m-2 text-ctp-text"
							onClick={handleSubmit}
						>
							Submit
						</button>
					</div>

					<div id="palette"></div>
				</>
			</div>
		</div>
	);
}

renderWidget(DiscordAuthPopup);
