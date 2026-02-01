import { useRef, useState } from 'react';

export default function Copy({ content }) {

	const textareaRef = useRef(null);
    const [label, setLabel] = useState('Copy');

	const handleCopy = async () => {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			try {
				await navigator.clipboard.writeText(content);
                setLabel('Copied!');
                setTimeout(() => setLabel('Copy'), 2000)
                return;
			} catch (e){}
		}
		const ta = textareaRef.current;
		if (!ta) return;
		ta.select();
		try {
            document.execCommand('copy');
            setLabel('Copied!');
            setTimeout(() => setLabel('Copy'), 2000)
        } catch (e){}
		ta.setSelectionRange(0, 0);
	};

	return (
		<div>
			<textarea
				ref={textareaRef}
				value={content}
				readOnly
				aria-hidden
				style={{
					position: 'absolute',
					left: '-9999px',
					top: '0',
					width: '1px',
					height: '1px',
					overflow: 'hidden',
				}}
			/>
			<button type="button" onClick={handleCopy}>{label}</button>
		</div>
	);

}
