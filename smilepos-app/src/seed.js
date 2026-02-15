import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const MENU_DATA = {
    "entrantes": [
        { "id": "e1", "name": { "es": "Croquetas de cocido" }, "price": "6.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-3.jpg", "category": "entrantes" },
        { "id": "e1762017224515", "name": { "es": "Nachos" }, "price": "12.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-8.jpg", "category": "entrantes" },
        { "id": "e1762017569807", "name": { "es": "Tequeños caseros" }, "price": "9.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-7.jpg", "category": "entrantes" },
        { "id": "e1762018085525", "name": { "es": "Tiras de Pollo Crunchy" }, "price": "8.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-9.jpg", "category": "entrantes" },
        { "id": "e2", "name": { "es": "Patatas Bravas" }, "price": "6.50", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-8.jpg", "category": "entrantes" },
        { "id": "e1762017937752", "name": { "es": "Pulled Pork Fries" }, "price": "8.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-6.jpg", "category": "entrantes" },
        { "id": "e1762620038868", "name": { "es": "Nachos Veganos" }, "price": "9.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-10-2.jpg", "category": "entrantes" }
    ],
    "burgers": [
        { "id": "b1", "name": { "es": "New York" }, "price": "12.50", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-12.jpg", "category": "burgers" },
        { "id": "b2", "name": { "es": "Paris" }, "price": "14.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-13.jpg", "category": "burgers" },
        { "id": "b5", "name": { "es": "Medellin" }, "price": "15.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-16.jpg", "category": "burgers" },
        { "id": "b6", "name": { "es": "México D.F." }, "price": "14.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-15.jpg", "category": "burgers" },
        { "id": "b7", "name": { "es": "Tarragona" }, "price": "14.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-2.jpg", "category": "burgers" },
        { "id": "b1762019238035", "name": { "es": "Chicago" }, "price": "14.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-1.jpg", "category": "burgers" },
        { "id": "b1762019406180", "name": { "es": "Bali" }, "price": "14.50", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-3.jpg", "category": "burgers" },
        { "id": "b1762620592490", "name": { "es": "Kids Menú" }, "price": "8.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Carta%20SmileBurger-18.png", "category": "burgers" }
    ],
    "postres": [
        { "id": "p1", "name": { "es": "Cheesecake cremoso" }, "price": "6.50", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-14.jpg", "category": "postres" },
        { "id": "p2", "name": { "es": "Coulant de Chocolate" }, "price": "5.50", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-12.jpg", "category": "postres" },
        { "id": "p3", "name": { "es": "Tequeños de Kinder" }, "price": "6.90", "img": "https://cdn.acadify.cloud/smile-menu-tinder/images/Smile%20-13.jpg", "category": "postres" }
    ],
    "bebidas": [
        { "id": "d1", "name": { "es": "Agua" }, "price": "2.30", "img": "https://placehold.co/600x400/0a0a0a/F59E0B?text=Agua", "category": "bebidas" },
        { "id": "d2", "name": { "es": "Coca-cola" }, "price": "2.90", "img": "https://placehold.co/600x400/0a0a0a/F59E0B?text=CocaCola", "category": "bebidas" },
        { "id": "d3", "name": { "es": "Fanta" }, "price": "2.90", "img": "https://placehold.co/600x400/0a0a0a/F59E0B?text=Fanta", "category": "bebidas" },
        { "id": "d6", "name": { "es": "Caña Estrella" }, "price": "2.80", "img": "https://placehold.co/600x400/0a0a0a/F59E0B?text=Estrella", "category": "bebidas" },
        { "id": "d12", "name": { "es": "Copa de Vino" }, "price": "3.50", "img": "https://placehold.co/600x400/0a0a0a/F59E0B?text=Vino", "category": "bebidas" }
    ]
};

const INITIAL_TABLES = [
    { id: '1', name: 'T1', status: 'free', stage: 'empty', total: 0, items: [] },
    { id: '2', name: 'T2', status: 'occupied', stage: 'burgers', total: 42.50, items: [] },
    { id: '3', name: 'T3', status: 'free', stage: 'empty', total: 0, items: [] },
    { id: '4', name: 'T4', status: 'occupied', stage: 'drinks', total: 9.20, items: [] },
    { id: '5', name: 'T5', status: 'occupied', stage: 'desserts', total: 55.40, items: [] },
    { id: '6', name: 'T6', status: 'payment', stage: 'payment', total: 45.90, items: [] },
    { id: '10', name: 'TR1', status: 'free', stage: 'empty', total: 0, items: [] },
    { id: '11', name: 'TR2', status: 'occupied', stage: 'starters', total: 18.00, items: [] },
];

export const seedDatabase = async () => {
    try {
        console.log('Starting seed...');
        // Seed Menu
        for (const category in MENU_DATA) {
            for (const item of MENU_DATA[category]) {
                await setDoc(doc(db, 'menu', item.id), item);
            }
        }

        // Seed Tables
        for (const table of INITIAL_TABLES) {
            await setDoc(doc(db, 'tables', table.id), table);
        }

        console.log('Database seeded successfully!');
        alert('¡Base de datos inicializada con éxito!');
    } catch (error) {
        console.error('Error seeding database:', error);
        alert('Error al inicializar: ' + error.message);
    }
};
