#!/usr/bin/env python
# -*- coding: iso-8859-1 -*-

from setuptools import setup

setup(
    name = 'jsio_trac_theme',
    version = '1.0',
    packages = ['jsio_trac_theme'],
    package_data = { 'jsio_trac_theme': [
        'templates/*.html',
        'htdocs/*.png',
        'htdocs/*.css'
        ] 
    },

    author = 'Michael Carter',
    author_email = 'CarterMichael@gmail.com',
    description = 'Theme for the JS.IO website',
    license = 'GPL',
    keywords = 'trac plugin theme',
    url = 'http://jsio.orbited.org',
    classifiers = [
        'Framework :: Trac',
    ],
    
    install_requires = ['Trac', 'TracThemeEngine>=2.0'],

    entry_points = {
        'trac.plugins': [
            'jsio_trac_theme.theme = jsio_trac_theme.theme',
        ]
    },
)
