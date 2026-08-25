import {
    Component,
    EventEmitter,
    Input,
    Output,
    OnInit,
    OnChanges,
    SimpleChanges,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LottieStickerComponent } from '../lottie-sticker/lottie-sticker.component';

export interface GifItem {
    id: string;
    title: string;
    previewUrl: string;
    url: string;
    width?: number;
    height?: number;
}

export interface StickerItem {
    id: string;
    name: string;
    lottieUrl: string;
    previewUrl?: string;
}

@Component({
    selector: 'fz-media-picker',
    standalone: true,
    imports: [CommonModule, FormsModule, LottieStickerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './media-picker.component.html',
    styleUrl: './media-picker.component.css'
})
export class MediaPickerComponent implements OnInit, OnChanges {
    private cdr = inject(ChangeDetectorRef);

    @Input() activeTab: 'emoji' | 'gif' | 'sticker' = 'emoji';
    @Output() selectEmoji = new EventEmitter<string>();
    @Output() selectGif = new EventEmitter<GifItem>();
    @Output() selectSticker = new EventEmitter<StickerItem>();
    @Output() close = new EventEmitter<void>();

    // --- Search inputs ---
    emojiSearch: string = '';
    gifSearch: string = '';
    stickerSearch: string = '';

    // --- State ---
    activeEmojiCategory: string = 'all';
    recentEmojis: string[] = [];
    gifs: GifItem[] = [];
    isGifsLoading: boolean = false;
    gifOffset: number = 0;
    hasMoreGifs: boolean = true;
    gifError: string = '';

    // --- GIF Config ---
    private giphyApiKey = 'PAGfiGABySUrkSU3Vfc9POemPETfnAE9';
    private searchTimeout: any;

    // --- Categories & Data ---
    gifCategories = [
        { label: '🔥 Thịnh hành', query: '' },
        { label: '🤣 Meme & Hài', query: 'meme' },
        { label: '✨ Anime & Manga', query: 'anime' },
        { label: '🎮 Gaming & Esports', query: 'gaming' },
        { label: '🐱 Mèo & Thú cưng', query: 'cute cat' },
        { label: '🎉 Ăn mừng', query: 'celebrate' },
        { label: '❤️ Thả tim', query: 'love heart' },
        { label: '👏 Vỗ tay', query: 'applause' },
        { label: '💃 Quẩy & Nhảy', query: 'dance' },
        { label: '😭 Khóc & Buồn', query: 'crying' },
        { label: '😱 Bất ngờ / Wow', query: 'shocked' },
        { label: '☕ Chill & Lofi', query: 'chill lofi' },
        { label: '🍕 Mlem đồ ăn', query: 'delicious food' },
        { label: '⚡ GG & Chiến thắng', query: 'victory win' }
    ];
    activeGifCategory: string = '';

    emojiCategories: { id: string; name: string; icon: string; emojis: string[] }[] = [
        {
            id: 'smileys',
            name: 'Mặt cười & Cảm xúc',
            icon: '😀',
            emojis: [
                '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗',
                '😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕',
                '🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨',
                '😰','😥','😓','🤗','🫡','🤔','🫣','🤭','🫢','🤫','🫠','🤥','😶','😶‍🌫️','😐','😑','😬','🫨','😮','😯',
                '😲','🥱','😴','🤤','😪','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹'
            ]
        },
        {
            id: 'gestures',
            name: 'Cử chỉ & Con người',
            icon: '👋',
            emojis: [
                '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫸','🫷','🫳','🫴','👌','🤌','🤏','✌️','🫰','🤞','🫰','🤟','🤘',
                '🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝',
                '🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅'
            ]
        },
        {
            id: 'animals',
            name: 'Động vật & Thiên nhiên',
            icon: '🐶',
            emojis: [
                '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊',
                '🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌',
                '🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀',
                '🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫'
            ]
        },
        {
            id: 'food',
            name: 'Đồ ăn & Đồ uống',
            icon: '🍔',
            emojis: [
                '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑',
                '🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳',
                '🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🥗','🥘','🫕',
                '🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨',
                '🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🫖','🍵',
                '🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'
            ]
        },
        {
            id: 'activities',
            name: 'Hoạt động & Trò chơi',
            icon: '🎮',
            emojis: [
                '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🎱','🥏','🏓','🏸','🏒','🏑','🥍','🏏','🥅','⛳','🪁','🏹',
                '🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾',
                '🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️',
                '🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️',
                '🎯','🎳','🎮','🎰','🧩'
            ]
        },
        {
            id: 'objects',
            name: 'Đồ vật & Biểu tượng',
            icon: '💡',
            emojis: [
                '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
                '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
                '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️',
                '🔥','✨','🌟','💫','💥','💢','💦','💨','🕳️','💣','💬','👁️‍🗨️','🗨️','🗯️','💭','💤','📱','💻','⌨️','🖥️',
                '🖨️','🖱️','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰',
                '💡','🔦','🏮','🪔','💎','💰','💵','💳','🔑','🗝️','🔒','🔓','🔔','🔕','🛡️','⚡','🚀','🛸','🎉','🎊'
            ]
        }
    ];

    // Curated high quality Animated Lottie Stickers
    stickers: StickerItem[] = [
        {
            id: 'cat-happy',
            name: 'Mèo Vui Vẻ',
            lottieUrl: 'https://assets5.lottiefiles.com/packages/lf20_tr1pjkop.json'
        },
        {
            id: 'party-celebrate',
            name: 'Tiệc Tùng',
            lottieUrl: 'https://assets2.lottiefiles.com/packages/lf20_u4yrau.json'
        },
        {
            id: 'duck-dancing',
            name: 'Vịt Quẩy',
            lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_m59b6h5q.json'
        },
        {
            id: 'fire-lit',
            name: 'Cháy Quá',
            lottieUrl: 'https://assets7.lottiefiles.com/packages/lf20_usmfx6bp.json'
        },
        {
            id: 'heart-pop',
            name: 'Thả Tim',
            lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_4kpomtpr.json'
        },
        {
            id: 'laughing-dog',
            name: 'Cười Bể Bụng',
            lottieUrl: 'https://assets4.lottiefiles.com/packages/lf20_ydo1amjm.json'
        },
        {
            id: 'gaming-robot',
            name: 'Chiến Game',
            lottieUrl: 'https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json'
        },
        {
            id: 'thumbs-up-star',
            name: 'Tuyệt Vời',
            lottieUrl: 'https://assets1.lottiefiles.com/packages/lf20_touohxv0.json'
        },
        {
            id: 'rocket-launch',
            name: 'Bay Lên Nào',
            lottieUrl: 'https://assets1.lottiefiles.com/packages/lf20_x62chJ.json'
        },
        {
            id: 'loading-cute',
            name: 'Chờ Xíu',
            lottieUrl: 'https://assets3.lottiefiles.com/packages/lf20_a2chheio.json'
        },
        {
            id: 'ghost-cute',
            name: 'Hù Dọa',
            lottieUrl: 'https://assets10.lottiefiles.com/packages/lf20_rgsng1vv.json'
        },
        {
            id: 'coffee-chill',
            name: 'Chill Cà Phê',
            lottieUrl: 'https://assets3.lottiefiles.com/packages/lf20_tijb25x0.json'
        }
    ];

    // Rich Diverse Curated Dataset across all categories
    private fallbackGifs: GifItem[] = [
        { id: 'f1', title: 'Happy Dance Cat', previewUrl: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
        { id: 'f2', title: 'Anime Popcorn', previewUrl: 'https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif', url: 'https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif' },
        { id: 'f3', title: 'Pikachu Excited', previewUrl: 'https://media.giphy.com/media/13G7hmmFr9yuxG/giphy.gif', url: 'https://media.giphy.com/media/13G7hmmFr9yuxG/giphy.gif' },
        { id: 'f4', title: 'Gamer Victory', previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
        { id: 'f5', title: 'Applause Leonardo', previewUrl: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
        { id: 'f6', title: 'Mind Blown', previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
        { id: 'f7', title: 'Dog Vibing', previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
        { id: 'f8', title: 'GG Well Played', previewUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
        { id: 'f9', title: 'Anime Cry Tears', previewUrl: 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif', url: 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif' },
        { id: 'f10', title: 'Confused Travolta', previewUrl: 'https://media.giphy.com/media/g01ZnwEHvCUCA4yCwT/giphy.gif', url: 'https://media.giphy.com/media/g01ZnwEHvCUCA4yCwT/giphy.gif' },
        { id: 'f11', title: 'K-Pop Heart Love', previewUrl: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif', url: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif' },
        { id: 'f12', title: 'Delicious Pizza Mukbang', previewUrl: 'https://media.giphy.com/media/1108D2tVaUN3eo/giphy.gif', url: 'https://media.giphy.com/media/1108D2tVaUN3eo/giphy.gif' },
        { id: 'f13', title: 'Lofi Girl Studying', previewUrl: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
        { id: 'f14', title: 'Cat Typing Fast', previewUrl: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
        { id: 'f15', title: 'Dance Party Celebration', previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
        { id: 'f16', title: 'Snoop Dogg Vibe', previewUrl: 'https://media.giphy.com/media/DhstvI3zZ598A/giphy.gif', url: 'https://media.giphy.com/media/DhstvI3zZ598A/giphy.gif' }
    ];

    ngOnInit() {
        this.loadRecentEmojis();
        if (this.activeTab === 'gif') {
            this.fetchGifs(true);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['activeTab'] && this.activeTab === 'gif' && this.gifs.length === 0) {
            this.fetchGifs(true);
        }
    }

    setTab(tab: 'emoji' | 'gif' | 'sticker') {
        this.activeTab = tab;
        if (tab === 'gif' && this.gifs.length === 0) {
            this.fetchGifs(true);
        }
        this.cdr.markForCheck();
    }

    // --- EMOJI METHODS ---

    onSelectEmoji(emoji: string) {
        this.addRecentEmoji(emoji);
        this.selectEmoji.emit(emoji);
    }

    private loadRecentEmojis() {
        try {
            const saved = localStorage.getItem('fz_recent_emojis');
            if (saved) {
                this.recentEmojis = JSON.parse(saved).slice(0, 16);
            }
        } catch {
            this.recentEmojis = ['❤️', '🔥', '😂', '👍', '✨', '🎉', '😍', '🎮'];
        }
        if (!this.recentEmojis.length) {
            this.recentEmojis = ['❤️', '🔥', '😂', '👍', '✨', '🎉', '😍', '🎮'];
        }
    }

    private addRecentEmoji(emoji: string) {
        this.recentEmojis = [emoji, ...this.recentEmojis.filter(e => e !== emoji)].slice(0, 16);
        try {
            localStorage.setItem('fz_recent_emojis', JSON.stringify(this.recentEmojis));
        } catch {
            // ignore
        }
    }

    get filteredEmojiCategories() {
        const query = this.emojiSearch.trim().toLowerCase();
        if (!query) {
            if (this.activeEmojiCategory === 'all') {
                return this.emojiCategories;
            }
            return this.emojiCategories.filter(c => c.id === this.activeEmojiCategory);
        }

        return this.emojiCategories.map(cat => ({
            ...cat,
            emojis: cat.emojis.filter(e => e.includes(query) || cat.name.toLowerCase().includes(query))
        })).filter(cat => cat.emojis.length > 0);
    }

    // --- GIF SEARCH & GIPHY / TENOR INTEGRATION ---

    onGifSearchChange(query: string) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.gifOffset = 0;
            this.fetchGifs(true);
        }, 350);
    }

    selectGifCategory(query: string) {
        this.activeGifCategory = query;
        this.gifSearch = query;
        this.gifOffset = 0;
        this.fetchGifs(true);
    }

    async fetchGifs(reset: boolean = false) {
        if (reset) {
            this.gifOffset = 0;
            this.gifs = [];
        }
        this.isGifsLoading = true;
        this.gifError = '';
        this.cdr.markForCheck();

        const query = this.gifSearch.trim();

        let url = '';
        if (query) {
            url = `https://api.giphy.com/v1/gifs/search?api_key=${this.giphyApiKey}&q=${encodeURIComponent(query)}&limit=24&offset=${this.gifOffset}&rating=g`;
        } else {
            url = `https://api.giphy.com/v1/gifs/trending?api_key=${this.giphyApiKey}&limit=24&offset=${this.gifOffset}&rating=g`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GIPHY status ${response.status}`);
            }
            const res = await response.json();

            this.isGifsLoading = false;
            if (res?.data && res.data.length > 0) {
                const newItems: GifItem[] = res.data.map((item: any) => ({
                    id: item.id,
                    title: item.title || 'GIF',
                    previewUrl: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || item.images?.original?.url,
                    url: item.images?.original?.url || item.images?.fixed_height?.url,
                    width: parseInt(item.images?.fixed_height?.width || '200'),
                    height: parseInt(item.images?.fixed_height?.height || '200')
                }));

                if (reset) {
                    this.gifs = newItems;
                } else {
                    const existingIds = new Set(this.gifs.map(g => g.id));
                    this.gifs = [...this.gifs, ...newItems.filter(g => !existingIds.has(g.id))];
                }
                this.hasMoreGifs = newItems.length >= 24;
            } else {
                if (reset) {
                    await this.fallbackToTenorOrCurated(query, reset);
                }
            }
        } catch (e) {
            console.warn('GIPHY fetch failed, falling back:', e);
            await this.fallbackToTenorOrCurated(query, reset);
        }

        this.isGifsLoading = false;
        this.cdr.markForCheck();
    }

    private async fallbackToTenorOrCurated(query: string, reset: boolean) {
        const tenorUrl = query
            ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=24`
            : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=24`;

        try {
            const resp = await fetch(tenorUrl);
            if (!resp.ok) throw new Error('Tenor error');
            const res = await resp.json();

            if (res?.results && res.results.length > 0) {
                const newItems: GifItem[] = res.results.map((item: any) => ({
                    id: item.id,
                    title: item.title || item.content_description || 'GIF',
                    previewUrl: item.media?.[0]?.nanogif?.url || item.media?.[0]?.tinygif?.url || item.media?.[0]?.gif?.url,
                    url: item.media?.[0]?.gif?.url || item.media?.[0]?.mediumgif?.url,
                }));
                this.gifs = reset ? newItems : [...this.gifs, ...newItems];
                return;
            }
        } catch {
            // ignore
        }

        this.useCuratedFallback(query, reset);
    }

    private useCuratedFallback(query: string, reset: boolean) {
        if (!query) {
            this.gifs = this.fallbackGifs;
        } else {
            const filtered = this.fallbackGifs.filter(g =>
                g.title.toLowerCase().includes(query.toLowerCase())
            );
            this.gifs = filtered.length > 0 ? filtered : this.fallbackGifs;
        }
    }

    loadMoreGifs() {
        if (this.isGifsLoading) return;
        this.gifOffset += 24;
        this.fetchGifs(false);
    }

    onSelectGif(gif: GifItem) {
        this.selectGif.emit(gif);
    }

    // --- STICKER METHODS ---

    get filteredStickers() {
        const query = this.stickerSearch.trim().toLowerCase();
        if (!query) return this.stickers;
        return this.stickers.filter(s => s.name.toLowerCase().includes(query));
    }

    onSelectSticker(sticker: StickerItem) {
        this.selectSticker.emit(sticker);
    }
}


