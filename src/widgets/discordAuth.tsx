import { renderWidget, useSyncedStorageState } from '@remnote/plugin-sdk';
import { useState } from 'react';
import { Buffer } from 'buffer';

const discurdUrl =
	'https://discord.com/api/oauth2/authorize?client_id=1083778386708676728&redirect_uri=http%3A%2F%2Flocalhost%3A6895%2Fcallback&response_type=code&scope=identify%20activities.write%20activities.read';

function DiscordAuth() {
	const [code, setCode] = useState('');
	const [value, setValue] = useSyncedStorageState<string>('discordAuthJson', '');

	const handleSubmit = () => {
		// handle code submission
		let userJson = JSON.parse(Buffer.from(code, 'base64').toString('utf-8'));
		// this will be a base 64 encoded string
		// what we need to do is decode it, and then parse it as json. Then we will have the access and refresh tokens

		setValue(JSON.stringify(userJson));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	};

	const handleLinkDiscord = () => {
		window.open(discurdUrl, '_blank');
	};

	return (
		<>
			<div className="rounded-md border border-solid rn-clr-background-primary rn-clr-content-primary p-10">
				<img
					src="https://raw.githubusercontent.com/coldenate/RemCord/main/public/rn-hz-logo.svg"
					className="max-h-[200px] w-auto p-4 mx-auto"
				/>
				<div className="flex text-center text-lg items-center pr-2">
					Hey there! Thank you for using RemCord!
				</div>
				<div className="flex text-center text-lg items-center pr-2">
					Click the "Link Discord Account" button to get started!
				</div>
				<div className="flex justify-center">
					<a
						href="TODO: Youtube Video"
						target="_blank"
						className="text-center text-lg items-center pr-2"
					>
						Here is a tutorial if you are confused
					</a>
				</div>
				<div className="flex justify-center">
					<button
						className="font-bold py-4 px-4"
						style={{
							borderRadius: '50px',
							background: '#5765f2',
							// boxShadow: '20px 20px 60px #4a56ce, -20px -20px 60px #6474ff',
						}}
						onClick={handleLinkDiscord}
					>
						Link Discord Account
					</button>
				</div>
				<div className="flex justify-center m-4">
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
				</div>
				<div className="flex justify-center">
					<button
						className="font-bold py-4 px-4"
						style={{
							borderRadius: '50px',
							background: '#5765f2',
						}}
						onClick={handleSubmit}
					>
						Submit
					</button>
				</div>
			</div>
		</>
	);
}

renderWidget(DiscordAuth);
